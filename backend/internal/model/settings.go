// Settings model for global application configuration
package model

import "time"

// Settings represents global application settings
type Settings struct {
	ID                  int       `json:"id"`
	DefaultOutputPath   string    `json:"defaultOutputPath"`
	EnableGPU           bool      `json:"enableGPU"`
	MaxConcurrentTasks  int       `json:"maxConcurrentTasks"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// DefaultSettings returns default application settings
func DefaultSettings() *Settings {
	return &Settings{
		ID:                 1, // Always use ID 1 for singleton settings
		DefaultOutputPath:  "/output",
		EnableGPU:          true,
		MaxConcurrentTasks: 3,
	}
}

