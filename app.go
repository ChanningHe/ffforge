package main

import (
	"context"
	"ffmpeg-web/internal/api"
	"ffmpeg-web/internal/database"
	"ffmpeg-web/internal/model"
	"ffmpeg-web/internal/service"
	"ffmpeg-web/internal/worker"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx        context.Context
	config     *Config
	db         *database.DB
	httpServer *http.Server
	workerPool *worker.Pool
	port       int
}

// Config holds the application configuration
type Config struct {
	DataPath           string
	OutputPath         string
	ConfigPath         string
	DatabasePath       string
	MaxConcurrentTasks int
	FFmpegPath         string
	FFprobePath        string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// GetLogPath returns the path to the log file
func (a *App) GetLogPath() string {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(homeDir, ".ffforge", "logs", "ffforge-desktop.log")
}

// OpenLogFile opens the log file in default text editor
func (a *App) OpenLogFile() error {
	logPath := a.GetLogPath()
	if logPath == "" {
		return fmt.Errorf("cannot determine log path")
	}

	// Try to open log file with default application
	var cmd *exec.Cmd
	switch goruntime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", logPath)
	case "darwin":
		cmd = exec.Command("open", logPath)
	default:
		cmd = exec.Command("xdg-open", logPath)
	}

	return cmd.Start()
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	log.Println("App startup initiated...")

	// Get user home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Printf("ERROR: Failed to get home directory: %v", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Startup Error",
			Message: fmt.Sprintf("Failed to get home directory: %v", err),
		})
		return
	}
	log.Printf("Home directory: %s", homeDir)

	// Set up app data directory
	appDataDir := filepath.Join(homeDir, ".ffforge")
	log.Printf("App data directory: %s", appDataDir)

	// Initialize configuration
	// For desktop app, default to user's home directory
	// Use bundled FFmpeg if available, otherwise fallback to system PATH
	ffmpegPath := GetBundledFFmpegPath()
	ffprobePath := GetBundledFFprobePath()

	log.Printf("FFmpeg path: %s", ffmpegPath)
	log.Printf("FFprobe path: %s", ffprobePath)

	a.config = &Config{
		DataPath:           homeDir,
		OutputPath:         filepath.Join(appDataDir, "output"),
		ConfigPath:         filepath.Join(appDataDir, "config"),
		DatabasePath:       filepath.Join(appDataDir, "config", "database", "ffforge.db"),
		MaxConcurrentTasks: 2,
		FFmpegPath:         ffmpegPath,
		FFprobePath:        ffprobePath,
	}

	// Ensure directories exist
	log.Println("Creating directories...")
	a.ensureDirectories()

	// Check FFmpeg availability (non-blocking)
	go a.checkFFmpegAvailability()

	// Initialize backend services
	log.Println("Initializing backend...")
	if err := a.initializeBackend(); err != nil {
		log.Printf("ERROR: Failed to initialize backend: %v", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Initialization Error",
			Message: fmt.Sprintf("Failed to initialize database:\n%v\n\nPlease check the log file at:\n%s", err, filepath.Join(homeDir, ".ffforge", "logs", "ffforge-desktop.log")),
		})
		return
	}

	// Start HTTP server
	log.Println("Starting HTTP server...")
	if err := a.startHTTPServer(); err != nil {
		log.Printf("ERROR: Failed to start HTTP server: %v", err)
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Server Error",
			Message: fmt.Sprintf("Failed to start server: %v", err),
		})
		return
	}

	log.Printf("FFForge Desktop started successfully on http://localhost:%d", a.port)
	runtime.LogInfof(ctx, "FFForge Desktop started on http://localhost:%d", a.port)
}

// checkFFmpegAvailability checks if FFmpeg is available (non-blocking warning)
func (a *App) checkFFmpegAvailability() {
	time.Sleep(2 * time.Second) // Wait for UI to load

	if err := a.db.Conn().Ping(); err != nil {
		// Database not initialized yet
		return
	}

	// Verify FFmpeg and FFprobe availability
	ffmpegPath, ffprobePath, err := VerifyFFmpegAvailability(a.config.FFmpegPath, a.config.FFprobePath)

	if err != nil {
		log.Printf("Warning: FFmpeg not found: %v", err)
		log.Printf("Please install FFmpeg or the bundled binaries may be missing")

		// Show warning dialog to user (non-blocking)
		runtime.MessageDialog(a.ctx, runtime.MessageDialogOptions{
			Type:    runtime.WarningDialog,
			Title:   "FFmpeg Not Found",
			Message: "FFmpeg is not installed or the bundled binaries are missing.\n\nPlease install FFmpeg to use transcoding features.",
		})
		return
	}

	log.Printf("✓ FFmpeg found: %s", ffmpegPath)
	log.Printf("✓ FFprobe found: %s", ffprobePath)

	// Update config with verified paths
	a.config.FFmpegPath = ffmpegPath
	a.config.FFprobePath = ffprobePath
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {
	if a.workerPool != nil {
		a.workerPool.Shutdown()
	}

	if a.httpServer != nil {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		a.httpServer.Shutdown(shutdownCtx)
	}

	if a.db != nil {
		a.db.Close()
	}
}

// ensureDirectories ensures required directories exist
func (a *App) ensureDirectories() {
	dirs := []string{
		a.config.OutputPath,
		a.config.ConfigPath,
		filepath.Dir(a.config.DatabasePath),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Warning: Failed to create directory %s: %v", dir, err)
		}
	}
}

// initializeBackend initializes database and services
func (a *App) initializeBackend() error {
	// Initialize database
	db, err := database.New(a.config.DatabasePath)
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}
	a.db = db

	// Initialize builtin presets
	if err := db.InitializeBuiltinPresets(); err != nil {
		log.Printf("Warning: Failed to initialize builtin presets: %v", err)
	}

	// Clean up interrupted tasks
	if err := a.cleanupInterruptedTasks(); err != nil {
		log.Printf("Warning: Failed to cleanup interrupted tasks: %v", err)
	}

	return nil
}

// startHTTPServer starts the embedded HTTP server
func (a *App) startHTTPServer() error {
	// Find available port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("failed to find available port: %w", err)
	}
	a.port = listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	// Initialize services with full filesystem access for desktop app
	fileService := service.NewFileServiceWithFullAccess(a.config.DataPath)
	hardwareService := service.NewHardwareService()
	hardwareService.SetFFmpegPath(a.config.FFmpegPath)
	ffmpegService := service.NewFFmpegService(
		a.config.FFmpegPath,
		a.config.FFprobePath,
		a.config.OutputPath,
	)
	systemService := service.NewSystemService()
	systemService.StartMonitoring()

	// Initialize worker pool
	a.workerPool = worker.NewPool(
		a.db,
		ffmpegService,
		fileService,
		a.config.MaxConcurrentTasks,
	)

	// Initialize WebSocket handler
	wsHandler := api.NewWebSocketHandler()
	a.workerPool.SetBroadcastChannel(wsHandler.GetBroadcastChannel())

	// Initialize API handlers
	filesHandler := api.NewFilesHandler(fileService, ffmpegService)
	tasksHandler := api.NewTasksHandler(a.db, a.workerPool, fileService)
	presetsHandler := api.NewPresetsHandler(a.db)
	hardwareHandler := api.NewHardwareHandler(hardwareService)
	settingsHandler := api.NewSettingsHandler(a.db.Conn())
	systemHandler := api.NewSystemHandler(systemService)

	// Setup Gin router
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// CORS middleware
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"*"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(corsConfig))

	// API routes
	apiGroup := router.Group("/api")
	{
		// Files
		apiGroup.GET("/files/browse", filesHandler.BrowseDirectory)
		apiGroup.GET("/files/info", filesHandler.GetFileInfo)
		apiGroup.GET("/files/default-path", filesHandler.GetDefaultPath)

		// Tasks
		apiGroup.POST("/tasks", tasksHandler.CreateTask)
		apiGroup.GET("/tasks", tasksHandler.GetAllTasks)
		apiGroup.GET("/tasks/:id", tasksHandler.GetTask)
		apiGroup.PUT("/tasks/:id/pause", tasksHandler.PauseTask)
		apiGroup.PUT("/tasks/:id/resume", tasksHandler.ResumeTask)
		apiGroup.PUT("/tasks/:id/cancel", tasksHandler.CancelTask)
		apiGroup.POST("/tasks/:id/retry", tasksHandler.RetryTask)
		apiGroup.DELETE("/tasks/:id", tasksHandler.DeleteTask)

		// Presets
		apiGroup.GET("/presets", presetsHandler.GetAllPresets)
		apiGroup.GET("/presets/:id", presetsHandler.GetPreset)
		apiGroup.POST("/presets", presetsHandler.CreatePreset)
		apiGroup.PUT("/presets/:id", presetsHandler.UpdatePreset)
		apiGroup.DELETE("/presets/:id", presetsHandler.DeletePreset)

		// Hardware
		apiGroup.GET("/hardware", hardwareHandler.GetHardwareInfo)
		apiGroup.GET("/hardware/capabilities", hardwareHandler.GetGPUCapabilities)

		// Settings
		apiGroup.GET("/settings", settingsHandler.GetSettings)
		apiGroup.PUT("/settings", settingsHandler.UpdateSettings)

		// System
		apiGroup.GET("/system/host", systemHandler.GetHostInfo)
		apiGroup.GET("/system/usage", systemHandler.GetUsage)
		apiGroup.GET("/system/history", systemHandler.GetHistory)

		// WebSocket
		apiGroup.GET("/ws/progress", wsHandler.HandleWebSocket)
	}

	// Start server in background
	a.httpServer = &http.Server{
		Addr:    fmt.Sprintf("127.0.0.1:%d", a.port),
		Handler: router,
	}

	go func() {
		if err := a.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			runtime.LogErrorf(a.ctx, "HTTP server error: %v", err)
		}
	}()

	return nil
}

// cleanupInterruptedTasks marks running or pending tasks as cancelled on app restart
func (a *App) cleanupInterruptedTasks() error {
	tasks, err := a.db.GetAllTasks()
	if err != nil {
		return err
	}

	now := time.Now()
	count := 0

	for _, task := range tasks {
		if task.Status == model.TaskStatusRunning || task.Status == model.TaskStatusPending {
			task.Status = model.TaskStatusCancelled
			task.Error = "Task interrupted by application restart"
			task.CompletedAt = &now

			if err := a.db.UpdateTask(task); err != nil {
				log.Printf("Failed to cleanup task %s: %v", task.ID, err)
				continue
			}

			count++
		}
	}

	if count > 0 {
		log.Printf("Cleaned up %d interrupted task(s)", count)
	}

	return nil
}

// GetServerURL returns the local server URL for the frontend
func (a *App) GetServerURL() string {
	return fmt.Sprintf("http://localhost:%d", a.port)
}

// SelectDirectory opens a directory selection dialog
func (a *App) SelectDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Directory",
	})
	return path, err
}

// SelectFile opens a file selection dialog
func (a *App) SelectFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select File",
	})
	return path, err
}

// GetAppInfo returns application information
func (a *App) GetAppInfo() map[string]interface{} {
	return map[string]interface{}{
		"version":    "1.0.0",
		"dataPath":   a.config.DataPath,
		"outputPath": a.config.OutputPath,
		"configPath": a.config.ConfigPath,
		"serverURL":  a.GetServerURL(),
	}
}
