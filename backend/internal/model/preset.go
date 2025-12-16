package model

import "time"

// Preset represents a saved transcode configuration preset
type Preset struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description,omitempty"`
	Config      TranscodeConfig `json:"config"`
	IsBuiltin   bool            `json:"isBuiltin"`
	CreatedAt   time.Time       `json:"createdAt"`
}




