// Settings model for global application configuration
package model

import "time"

// FilePermissionMode represents the mode for handling output file permissions
type FilePermissionMode string

const (
	// FilePermissionSameAsSource reads source file's uid/gid and applies to output file
	FilePermissionSameAsSource FilePermissionMode = "same_as_source"
	// FilePermissionSpecify uses user-specified uid and gid
	FilePermissionSpecify FilePermissionMode = "specify"
	// FilePermissionNoAction does not modify file permissions (keeps as root)
	FilePermissionNoAction FilePermissionMode = "no_action"
)

// Settings represents global application settings
type Settings struct {
	ID                  int                `json:"id"`
	DefaultOutputPath   string             `json:"defaultOutputPath"`
	EnableGPU           bool               `json:"enableGPU"`
	MaxConcurrentTasks  int                `json:"maxConcurrentTasks"`
	FFmpegPath          string             `json:"ffmpegPath"`
	FFprobePath         string             `json:"ffprobePath"`
	FilePermissionMode  FilePermissionMode `json:"filePermissionMode"`
	FilePermissionUID   int                `json:"filePermissionUid,omitempty"`
	FilePermissionGID   int                `json:"filePermissionGid,omitempty"`
	CreatedAt           time.Time          `json:"createdAt"`
	UpdatedAt           time.Time          `json:"updatedAt"`
}

// DefaultSettings returns default application settings
func DefaultSettings() *Settings {
	return &Settings{
		ID:                 1, // Always use ID 1 for singleton settings
		DefaultOutputPath:  "/output",
		EnableGPU:          true,
		MaxConcurrentTasks: 3,
		FFmpegPath:         "ffmpeg",
		FFprobePath:        "ffprobe",
		FilePermissionMode: FilePermissionSameAsSource, // Default: same as source
		FilePermissionUID:  0,
		FilePermissionGID:  0,
	}
}

