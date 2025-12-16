package api

import (
	"ffmpeg-web/internal/database"
	"ffmpeg-web/internal/model"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WorkerPool interface for task submission
type WorkerPool interface {
	SubmitTask(taskID string)
	CancelTask(taskID string) error
}

// TasksHandler handles task-related API requests
type TasksHandler struct {
	db   *database.DB
	pool WorkerPool
}

// NewTasksHandler creates a new tasks handler
func NewTasksHandler(db *database.DB, pool WorkerPool) *TasksHandler {
	return &TasksHandler{
		db:   db,
		pool: pool,
	}
}

// CreateTaskRequest represents a request to create a new task
type CreateTaskRequest struct {
	SourceFiles []string              `json:"sourceFiles" binding:"required"`
	Preset      string                `json:"preset,omitempty"`
	Config      *model.TranscodeConfig `json:"config,omitempty"`
}

// CreateTask handles POST /api/tasks
func (h *TasksHandler) CreateTask(c *gin.Context) {
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate request
	if len(req.SourceFiles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no source files provided"})
		return
	}

	// Get config from preset or use provided config
	var config model.TranscodeConfig
	if req.Preset != "" {
		preset, err := h.db.GetPreset(req.Preset)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "preset not found"})
			return
		}
		config = preset.Config
	} else if req.Config != nil {
		config = *req.Config
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "either preset or config must be provided"})
		return
	}

	// Create tasks for each source file
	tasks := make([]*model.Task, 0, len(req.SourceFiles))
	for _, sourceFile := range req.SourceFiles {
		task := &model.Task{
			ID:         uuid.New().String(),
			SourceFile: sourceFile,
			OutputFile: "", // Will be set by worker
			Status:     model.TaskStatusPending,
			Progress:   0,
			Speed:      0,
			ETA:        0,
			CreatedAt:  time.Now(),
			Preset:     req.Preset,
			Config:     config,
		}

		if err := h.db.CreateTask(task); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create task"})
			return
		}

		// Submit task to worker pool
		h.pool.SubmitTask(task.ID)

		tasks = append(tasks, task)
	}

	c.JSON(http.StatusOK, tasks)
}

// GetAllTasks handles GET /api/tasks
func (h *TasksHandler) GetAllTasks(c *gin.Context) {
	tasks, err := h.db.GetAllTasks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve tasks"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// GetTask handles GET /api/tasks/:id
func (h *TasksHandler) GetTask(c *gin.Context) {
	id := c.Param("id")

	task, err := h.db.GetTask(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	c.JSON(http.StatusOK, task)
}

// DeleteTask handles DELETE /api/tasks/:id
func (h *TasksHandler) DeleteTask(c *gin.Context) {
	id := c.Param("id")

	// Get task to check status
	task, err := h.db.GetTask(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	// Can only delete completed, failed, or cancelled tasks
	if task.Status == model.TaskStatusRunning {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete running task"})
		return
	}

	if err := h.db.DeleteTask(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task deleted"})
}

// PauseTask handles PUT /api/tasks/:id/pause
func (h *TasksHandler) PauseTask(c *gin.Context) {
	// Placeholder - will be implemented with worker pool
	c.JSON(http.StatusNotImplemented, gin.H{"error": "pause not yet implemented"})
}

// ResumeTask handles PUT /api/tasks/:id/resume
func (h *TasksHandler) ResumeTask(c *gin.Context) {
	// Placeholder - will be implemented with worker pool
	c.JSON(http.StatusNotImplemented, gin.H{"error": "resume not yet implemented"})
}

// CancelTask handles PUT /api/tasks/:id/cancel
func (h *TasksHandler) CancelTask(c *gin.Context) {
	id := c.Param("id")

	// Get task to check status
	task, err := h.db.GetTask(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	// Can only cancel running tasks
	if task.Status != model.TaskStatusRunning {
		c.JSON(http.StatusBadRequest, gin.H{"error": "task is not running"})
		return
	}

	// Cancel task
	if err := h.pool.CancelTask(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cancel task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "task cancelled"})
}

