package worker

import (
	"bufio"
	"bytes"
	"context"
	"ffmpeg-web/internal/database"
	"ffmpeg-web/internal/model"
	"ffmpeg-web/internal/service"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Pool manages a pool of workers for processing transcode tasks
type Pool struct {
	db                *database.DB
	ffmpegService     *service.FFmpegService
	fileService       *service.FileService
	permissionService *service.PermissionService
	maxWorkers        int
	taskQueue         chan string // Task IDs
	cancelFuncs       map[string]context.CancelFunc
	mu                sync.RWMutex
	progressChan      chan *ProgressUpdate
	externalBroadcast chan<- *ProgressUpdate // External broadcast channel (e.g., WebSocket)
	ctx               context.Context
	cancel            context.CancelFunc
	wg                sync.WaitGroup
}

// ProgressUpdate represents a progress update for a task
type ProgressUpdate struct {
	TaskID   string  `json:"taskId"`
	Status   string  `json:"status"`
	Progress float64 `json:"progress"`
	Speed    float64 `json:"speed"`
	ETA      int64   `json:"eta"`
	Error    string  `json:"error,omitempty"`
}

// NewPool creates a new worker pool
func NewPool(db *database.DB, ffmpegService *service.FFmpegService, fileService *service.FileService, maxWorkers int) *Pool {
	ctx, cancel := context.WithCancel(context.Background())

	pool := &Pool{
		db:                db,
		ffmpegService:     ffmpegService,
		fileService:       fileService,
		permissionService: service.NewPermissionService(),
		maxWorkers:        maxWorkers,
		taskQueue:         make(chan string, 100),
		cancelFuncs:       make(map[string]context.CancelFunc),
		progressChan:      make(chan *ProgressUpdate, 100),
		ctx:               ctx,
		cancel:            cancel,
	}

	// Start workers
	for i := 0; i < maxWorkers; i++ {
		pool.wg.Add(1)
		go pool.worker(i)
	}

	// Start progress broadcaster
	pool.wg.Add(1)
	go pool.progressBroadcaster()

	// Load pending tasks from database
	go pool.loadPendingTasks()

	return pool
}

// worker processes tasks from the queue
func (p *Pool) worker(id int) {
	defer p.wg.Done()

	log.Printf("Worker %d started", id)

	for {
		select {
		case <-p.ctx.Done():
			log.Printf("Worker %d stopped", id)
			return
		case taskID, ok := <-p.taskQueue:
			if !ok {
				log.Printf("Worker %d: task queue closed", id)
				return
			}

			log.Printf("Worker %d: processing task %s", id, taskID)
			p.processTask(taskID)
		}
	}
}

// processTask processes a single transcode task
func (p *Pool) processTask(taskID string) {
	// Get task from database
	task, err := p.db.GetTask(taskID)
	if err != nil {
		log.Printf("Failed to get task %s: %v", taskID, err)
		return
	}

	// Skip if already processing or completed
	if task.Status != model.TaskStatusPending {
		return
	}

	// Update task status to running
	now := time.Now()
	task.Status = model.TaskStatusRunning
	task.StartedAt = &now
	if err := p.db.UpdateTask(task); err != nil {
		log.Printf("Failed to update task status: %v", err)
		return
	}

	// Get full source file path
	sourceFile, err := p.fileService.GetFullPath(task.SourceFile)
	if err != nil {
		p.failTask(task, err.Error())
		return
	}

	// Get source file size
	sourceFileInfo, err := os.Stat(sourceFile)
	if err != nil {
		log.Printf("Warning: Failed to get source file size: %v", err)
	} else {
		task.SourceFileSize = sourceFileInfo.Size()
		p.db.UpdateTask(task)
	}

	// Probe source file to get duration
	videoInfo, err := p.ffmpegService.ProbeFile(sourceFile)
	if err != nil {
		p.failTask(task, "failed to probe source file: "+err.Error())
		return
	}

	totalDuration := videoInfo.Duration

	// Generate output file path
	outputFile := p.ffmpegService.GenerateOutputPath(task.SourceFile, &task.Config)
	task.OutputFile = outputFile
	p.db.UpdateTask(task)

	// Output file is already a full path from GenerateOutputPath
	fullOutputFile := outputFile

	// Ensure output directory exists
	outputDir := filepath.Dir(fullOutputFile)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		p.failTask(task, "failed to create output directory: "+err.Error())
		return
	}

	// Create context for this task
	taskCtx, cancel := context.WithCancel(p.ctx)
	p.mu.Lock()
	p.cancelFuncs[taskID] = cancel
	p.mu.Unlock()

	defer func() {
		p.mu.Lock()
		delete(p.cancelFuncs, taskID)
		p.mu.Unlock()
	}()

	// Build FFmpeg command
	cmd := p.ffmpegService.BuildCommand(taskCtx, sourceFile, fullOutputFile, &task.Config)

	// Get stderr pipe for progress and error messages
	stderr, err := cmd.StderrPipe()
	if err != nil {
		p.failTask(task, "failed to get stderr pipe: "+err.Error())
		return
	}

	// Also capture stderr for error messages
	var stderrBuf bytes.Buffer

	// Start command
	if err := cmd.Start(); err != nil {
		p.failTask(task, "failed to start ffmpeg: "+err.Error())
		return
	}

	log.Printf("FFmpeg command started for task %s", taskID)

	// Monitor progress
	go func() {
		progressChan := make(chan *service.ProgressUpdate, 10)

		// Tee stderr to both progress parser and buffer
		teeReader := io.TeeReader(stderr, &stderrBuf)
		scanner := bufio.NewScanner(teeReader)

		go service.StreamProgress(scanner, progressChan)

		for update := range progressChan {
			progress, eta := service.CalculateProgress(update.OutTime, totalDuration, update.Speed)

			p.progressChan <- &ProgressUpdate{
				TaskID:   taskID,
				Status:   string(model.TaskStatusRunning),
				Progress: progress,
				Speed:    update.Speed,
				ETA:      eta,
			}

			// Update task in database
			task.Progress = progress
			task.Speed = update.Speed
			task.ETA = eta
			p.db.UpdateTask(task)
		}
	}()

	// Wait for command to complete
	err = cmd.Wait()

	if err != nil {
		if taskCtx.Err() == context.Canceled {
			// Task was cancelled
			task.Status = model.TaskStatusCancelled
			p.db.UpdateTask(task)
			return
		}

		// Include stderr output in error message
		errorMsg := fmt.Sprintf("ffmpeg error: %v", err)
		if stderrBuf.Len() > 0 {
			// Get last 1000 characters of stderr
			stderrStr := stderrBuf.String()
			if len(stderrStr) > 1000 {
				stderrStr = stderrStr[len(stderrStr)-1000:]
			}
			errorMsg = fmt.Sprintf("%s\nFFmpeg output:\n%s", errorMsg, stderrStr)
		}

		p.failTask(task, errorMsg)
		return
	}

	// Task completed successfully
	completedAt := time.Now()
	task.Status = model.TaskStatusCompleted
	task.CompletedAt = &completedAt
	task.Progress = 100
	task.Speed = 0
	task.ETA = 0

	// Get output file size
	outputFileInfo, err := os.Stat(fullOutputFile)
	if err != nil {
		log.Printf("Warning: Failed to get output file size: %v", err)
	} else {
		task.OutputFileSize = outputFileInfo.Size()
	}

	if err := p.db.UpdateTask(task); err != nil {
		log.Printf("Failed to update completed task: %v", err)
	}

	// Apply file permissions based on settings
	p.applyFilePermissions(task, sourceFile, fullOutputFile)

	p.progressChan <- &ProgressUpdate{
		TaskID:   taskID,
		Status:   string(model.TaskStatusCompleted),
		Progress: 100,
		Speed:    0,
		ETA:      0,
	}

	log.Printf("Task %s completed successfully", taskID)
}

// failTask marks a task as failed
func (p *Pool) failTask(task *model.Task, errorMsg string) {
	log.Printf("Task %s failed: %s", task.ID, errorMsg)

	task.Status = model.TaskStatusFailed
	task.Error = errorMsg
	completedAt := time.Now()
	task.CompletedAt = &completedAt

	if err := p.db.UpdateTask(task); err != nil {
		log.Printf("Failed to update failed task: %v", err)
	}

	p.progressChan <- &ProgressUpdate{
		TaskID: task.ID,
		Status: string(model.TaskStatusFailed),
		Error:  errorMsg,
	}
}

// progressBroadcaster broadcasts progress updates
func (p *Pool) progressBroadcaster() {
	defer p.wg.Done()

	for {
		select {
		case <-p.ctx.Done():
			return
		case update, ok := <-p.progressChan:
			if !ok {
				return
			}

			// Log progress
			if update.Error != "" {
				log.Printf("Progress: Task %s failed: %s", update.TaskID, update.Error)
			} else {
				log.Printf("Progress: Task %s - %.2f%% (%.2fx, ETA %ds)",
					update.TaskID, update.Progress, update.Speed, update.ETA)
			}

			// Broadcast to external channel (e.g., WebSocket)
			if p.externalBroadcast != nil {
				select {
				case p.externalBroadcast <- update:
				default:
					log.Println("External broadcast channel full, dropping message")
				}
			}
		}
	}
}

// SetBroadcastChannel sets the external broadcast channel
func (p *Pool) SetBroadcastChannel(ch chan<- *ProgressUpdate) {
	p.externalBroadcast = ch
}

// SubmitTask adds a task to the queue
func (p *Pool) SubmitTask(taskID string) {
	select {
	case p.taskQueue <- taskID:
		log.Printf("Task %s submitted to queue", taskID)
	default:
		log.Printf("Task queue full, task %s not submitted", taskID)
	}
}

// CancelTask cancels a running task
func (p *Pool) CancelTask(taskID string) error {
	p.mu.RLock()
	cancel, exists := p.cancelFuncs[taskID]
	p.mu.RUnlock()

	if !exists {
		return fmt.Errorf("task not running")
	}

	cancel()
	return nil
}

// loadPendingTasks loads pending tasks from database and submits them to queue
func (p *Pool) loadPendingTasks() {
	// Wait a bit for workers to start
	time.Sleep(time.Second)

	tasks, err := p.db.GetAllTasks()
	if err != nil {
		log.Printf("Failed to load tasks: %v", err)
		return
	}

	for _, task := range tasks {
		if task.Status == model.TaskStatusPending {
			p.SubmitTask(task.ID)
		}
	}

	log.Printf("Loaded %d pending tasks", len(tasks))
}

// applyFilePermissions applies file permissions to the output file based on settings
func (p *Pool) applyFilePermissions(task *model.Task, sourceFile, outputFile string) {
	// Get settings from database
	var settings model.Settings
	err := p.db.Conn().QueryRow(`
		SELECT file_permission_mode, file_permission_uid, file_permission_gid
		FROM settings WHERE id = 1
	`).Scan(&settings.FilePermissionMode, &settings.FilePermissionUID, &settings.FilePermissionGID)

	if err != nil {
		log.Printf("Warning: Failed to get settings for file permissions: %v", err)
		return
	}

	// Apply permissions
	applied, err := p.permissionService.ApplyFilePermissions(outputFile, sourceFile, &settings)
	if err != nil {
		log.Printf("Warning: Failed to apply file permissions for task %s: %v", task.ID, err)
		// Don't fail the task, just log the warning
		return
	}

	if applied {
		log.Printf("File permissions applied successfully for task %s", task.ID)
	}
}

// Shutdown gracefully shuts down the worker pool
func (p *Pool) Shutdown() {
	log.Println("Shutting down worker pool...")
	p.cancel()
	close(p.taskQueue)
	p.wg.Wait()
	log.Println("Worker pool shutdown complete")
}
