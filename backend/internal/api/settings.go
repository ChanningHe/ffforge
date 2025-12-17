// Settings API handlers
package api

import (
	"database/sql"
	"ffmpeg-web/internal/model"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// SettingsHandler handles settings-related requests
type SettingsHandler struct {
	db *sql.DB
}

// NewSettingsHandler creates a new settings handler
func NewSettingsHandler(db *sql.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

// GetSettings retrieves global settings
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings model.Settings
	err := h.db.QueryRow(`
		SELECT id, default_output_path, enable_gpu, max_concurrent_tasks, ffmpeg_path, ffprobe_path, 
		       file_permission_mode, file_permission_uid, file_permission_gid, created_at, updated_at 
		FROM settings WHERE id = 1
	`).Scan(&settings.ID, &settings.DefaultOutputPath, &settings.EnableGPU, &settings.MaxConcurrentTasks, 
		&settings.FFmpegPath, &settings.FFprobePath, 
		&settings.FilePermissionMode, &settings.FilePermissionUID, &settings.FilePermissionGID,
		&settings.CreatedAt, &settings.UpdatedAt)

	if err == sql.ErrNoRows {
		// If no settings exist, create default settings
		defaults := model.DefaultSettings()
		now := time.Now()
		_, err := h.db.Exec(`
			INSERT INTO settings (id, default_output_path, enable_gpu, max_concurrent_tasks, ffmpeg_path, ffprobe_path, 
			                      file_permission_mode, file_permission_uid, file_permission_gid, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, defaults.ID, defaults.DefaultOutputPath, defaults.EnableGPU, defaults.MaxConcurrentTasks, 
			defaults.FFmpegPath, defaults.FFprobePath, 
			defaults.FilePermissionMode, defaults.FilePermissionUID, defaults.FilePermissionGID,
			now, now)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default settings"})
			return
		}

		settings = *defaults
		settings.CreatedAt = now
		settings.UpdatedAt = now
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSettings updates global settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var input struct {
		DefaultOutputPath  *string                 `json:"defaultOutputPath"`
		EnableGPU          *bool                   `json:"enableGPU"`
		MaxConcurrentTasks *int                    `json:"maxConcurrentTasks"`
		FFmpegPath         *string                 `json:"ffmpegPath"`
		FFprobePath        *string                 `json:"ffprobePath"`
		FilePermissionMode *model.FilePermissionMode `json:"filePermissionMode"`
		FilePermissionUID  *int                    `json:"filePermissionUid"`
		FilePermissionGID  *int                    `json:"filePermissionGid"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current settings
	var settings model.Settings
	err := h.db.QueryRow(`
		SELECT id, default_output_path, enable_gpu, max_concurrent_tasks, ffmpeg_path, ffprobe_path, 
		       file_permission_mode, file_permission_uid, file_permission_gid, created_at, updated_at 
		FROM settings WHERE id = 1
	`).Scan(&settings.ID, &settings.DefaultOutputPath, &settings.EnableGPU, &settings.MaxConcurrentTasks, 
		&settings.FFmpegPath, &settings.FFprobePath, 
		&settings.FilePermissionMode, &settings.FilePermissionUID, &settings.FilePermissionGID,
		&settings.CreatedAt, &settings.UpdatedAt)

	if err == sql.ErrNoRows {
		// If no settings exist, create defaults first
		defaults := model.DefaultSettings()
		now := time.Now()
		_, err := h.db.Exec(`
			INSERT INTO settings (id, default_output_path, enable_gpu, max_concurrent_tasks, ffmpeg_path, ffprobe_path, 
			                      file_permission_mode, file_permission_uid, file_permission_gid, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, defaults.ID, defaults.DefaultOutputPath, defaults.EnableGPU, defaults.MaxConcurrentTasks, 
			defaults.FFmpegPath, defaults.FFprobePath, 
			defaults.FilePermissionMode, defaults.FilePermissionUID, defaults.FilePermissionGID,
			now, now)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settings"})
			return
		}

		settings = *defaults
		settings.CreatedAt = now
		settings.UpdatedAt = now
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	// Update only provided fields
	if input.DefaultOutputPath != nil {
		settings.DefaultOutputPath = *input.DefaultOutputPath
	}
	if input.EnableGPU != nil {
		settings.EnableGPU = *input.EnableGPU
	}
	if input.MaxConcurrentTasks != nil {
		settings.MaxConcurrentTasks = *input.MaxConcurrentTasks
	}
	if input.FFmpegPath != nil {
		settings.FFmpegPath = *input.FFmpegPath
	}
	if input.FFprobePath != nil {
		settings.FFprobePath = *input.FFprobePath
	}
	if input.FilePermissionMode != nil {
		settings.FilePermissionMode = *input.FilePermissionMode
	}
	if input.FilePermissionUID != nil {
		settings.FilePermissionUID = *input.FilePermissionUID
	}
	if input.FilePermissionGID != nil {
		settings.FilePermissionGID = *input.FilePermissionGID
	}

	// Update settings in database
	settings.UpdatedAt = time.Now()
	_, err = h.db.Exec(`
		UPDATE settings 
		SET default_output_path = ?, enable_gpu = ?, max_concurrent_tasks = ?, ffmpeg_path = ?, ffprobe_path = ?, 
		    file_permission_mode = ?, file_permission_uid = ?, file_permission_gid = ?, updated_at = ?
		WHERE id = 1
	`, settings.DefaultOutputPath, settings.EnableGPU, settings.MaxConcurrentTasks, settings.FFmpegPath, settings.FFprobePath,
		settings.FilePermissionMode, settings.FilePermissionUID, settings.FilePermissionGID, settings.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, settings)
}
