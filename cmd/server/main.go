package main

import (
	"ffmpeg-web/internal/api"
	"ffmpeg-web/internal/database"
	"ffmpeg-web/internal/model"
	"ffmpeg-web/internal/service"
	"ffmpeg-web/internal/worker"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration from environment
	config := loadConfig()

	// Initialize database
	db, err := database.New(config.DatabasePath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize builtin presets
	if err := db.InitializeBuiltinPresets(); err != nil {
		log.Printf("Warning: Failed to initialize builtin presets: %v", err)
	}

	// Clean up interrupted tasks on startup
	if err := cleanupInterruptedTasks(db); err != nil {
		log.Printf("Warning: Failed to cleanup interrupted tasks: %v", err)
	}

	// Initialize services
	fileService := service.NewFileService(config.DataPath)
	hardwareService := service.NewHardwareService()
	hardwareService.SetFFmpegPath(config.FFmpegPath)
	ffmpegService := service.NewFFmpegService(config.FFmpegPath, config.FFprobePath, config.OutputPath)
	systemService := service.NewSystemService()
	systemService.StartMonitoring()
	defer systemService.StopMonitoring()

	// Initialize worker pool
	workerPool := worker.NewPool(db, ffmpegService, fileService, config.MaxConcurrentTasks)
	defer workerPool.Shutdown()

	// Initialize WebSocket handler
	wsHandler := api.NewWebSocketHandler()
	workerPool.SetBroadcastChannel(wsHandler.GetBroadcastChannel())

	// Initialize API handlers
	filesHandler := api.NewFilesHandler(fileService, ffmpegService)
	tasksHandler := api.NewTasksHandler(db, workerPool, fileService)
	presetsHandler := api.NewPresetsHandler(db)
	hardwareHandler := api.NewHardwareHandler(hardwareService)
	settingsHandler := api.NewSettingsHandler(db.Conn())
	systemHandler := api.NewSystemHandler(systemService)

	// Setup Gin router
	if config.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// CORS middleware
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{config.CORSOrigins}
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

	// Serve static files (frontend) in production
	if _, err := os.Stat("./web"); err == nil {
		// Serve all static files from web directory
		router.Static("/assets", "./web/assets")
		router.StaticFile("/logo.png", "./web/logo.png")
		router.StaticFile("/logo.svg", "./web/logo.svg")

		// Serve index.html for root and handle SPA routing
		router.StaticFile("/", "./web/index.html")
		router.NoRoute(func(c *gin.Context) {
			c.File("./web/index.html")
		})
	}

	// Start server
	addr := fmt.Sprintf(":%s", config.Port)
	log.Printf("Server starting on %s", addr)
	log.Printf("Data path: %s", config.DataPath)
	log.Printf("Output path: %s", config.OutputPath)
	log.Printf("Max concurrent tasks: %d", config.MaxConcurrentTasks)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Config holds the application configuration
type Config struct {
	Port               string
	GinMode            string
	DataPath           string
	OutputPath         string
	ConfigPath         string
	DatabasePath       string
	MaxConcurrentTasks int
	EnableGPU          bool
	CORSOrigins        string
	FFmpegPath         string
	FFprobePath        string
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
	config := &Config{
		Port:               getEnv("PORT", "8080"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		DataPath:           getEnv("DATA_PATH", "/data"),
		OutputPath:         getEnv("OUTPUT_PATH", "/output"),
		ConfigPath:         getEnv("CONFIG_PATH", "./config"),
		DatabasePath:       getEnv("DATABASE_PATH", "./config/database/ffforge.db"),
		MaxConcurrentTasks: getEnvInt("MAX_CONCURRENT_TASKS", 2),
		EnableGPU:          getEnvBool("ENABLE_GPU", true),
		CORSOrigins:        getEnv("CORS_ORIGINS", "http://localhost:3000"),
		FFmpegPath:         getEnv("FFMPEG_PATH", "ffmpeg"),
		FFprobePath:        getEnv("FFPROBE_PATH", "ffprobe"),
	}

	// Ensure directories exist
	ensureDir(config.OutputPath)
	ensureDir(config.ConfigPath)
	ensureDir(filepath.Dir(config.DatabasePath))

	return config
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvInt gets an integer environment variable with a default value
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		var intValue int
		if _, err := fmt.Sscanf(value, "%d", &intValue); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getEnvBool gets a boolean environment variable with a default value
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}

// ensureDir ensures a directory exists, creating it if necessary
func ensureDir(path string) {
	if err := os.MkdirAll(path, 0755); err != nil {
		log.Printf("Warning: Failed to create directory %s: %v", path, err)
	}
}

// cleanupInterruptedTasks marks running or pending tasks as cancelled on app restart
func cleanupInterruptedTasks(db *database.DB) error {
	tasks, err := db.GetAllTasks()
	if err != nil {
		return err
	}

	now := time.Now()
	count := 0

	for _, task := range tasks {
		// Mark running or pending tasks as cancelled (interrupted by restart)
		if task.Status == model.TaskStatusRunning || task.Status == model.TaskStatusPending {
			// Capture original status before modifying
			originalStatus := task.Status

			task.Status = model.TaskStatusCancelled
			task.Error = "Task interrupted by application restart"
			task.CompletedAt = &now

			if err := db.UpdateTask(task); err != nil {
				log.Printf("Failed to cleanup task %s: %v", task.ID, err)
				continue
			}

			count++
			log.Printf("Cleaned up interrupted task: %s (was %s)", task.ID, originalStatus)
		}
	}

	if count > 0 {
		log.Printf("Cleaned up %d interrupted task(s)", count)
	}

	return nil
}
