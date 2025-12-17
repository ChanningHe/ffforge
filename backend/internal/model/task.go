package model

import (
	"time"
)

// TaskStatus represents the status of a transcode task
type TaskStatus string

const (
	TaskStatusPending   TaskStatus = "pending"
	TaskStatusRunning   TaskStatus = "running"
	TaskStatusCompleted TaskStatus = "completed"
	TaskStatusFailed    TaskStatus = "failed"
	TaskStatusCancelled TaskStatus = "cancelled"
)

// Task represents a video transcode task
type Task struct {
	ID             string          `json:"id"`
	SourceFile     string          `json:"sourceFile"`
	OutputFile     string          `json:"outputFile"`
	Status         TaskStatus      `json:"status"`
	Progress       float64         `json:"progress"`
	Speed          float64         `json:"speed"`
	ETA            int64           `json:"eta"` // seconds
	Error          string          `json:"error,omitempty"`
	SourceFileSize int64           `json:"sourceFileSize,omitempty"` // in bytes
	OutputFileSize int64           `json:"outputFileSize,omitempty"` // in bytes
	CreatedAt      time.Time       `json:"createdAt"`
	StartedAt      *time.Time      `json:"startedAt,omitempty"`
	CompletedAt    *time.Time      `json:"completedAt,omitempty"`
	Preset         string          `json:"preset,omitempty"`
	Config         TranscodeConfig `json:"config"`
}

// TranscodeConfig represents the configuration for a transcode task
type TranscodeConfig struct {
	// Mode: "simple" (UI-based config) or "advanced" (custom CLI)
	Mode           string       `json:"mode,omitempty"` // simple, advanced (default: simple)
	
	// Simple mode fields (UI-based configuration)
	Encoder        string       `json:"encoder"` // h265, av1
	HardwareAccel  string       `json:"hardwareAccel"` // cpu, nvidia, intel, amd
	Video          VideoConfig  `json:"video"`
	Audio          AudioConfig  `json:"audio"`
	Output         OutputConfig `json:"output"`
	ExtraParams    string       `json:"extraParams,omitempty"` // Extra FFmpeg parameters
	
	// Advanced mode field (custom CLI parameters)
	CustomCommand  string       `json:"customCommand,omitempty"` // Custom FFmpeg parameters (between input and output)
}

// VideoConfig represents video encoding configuration
type VideoConfig struct {
	CRF        int    `json:"crf,omitempty"`
	Preset     string `json:"preset,omitempty"`
	Resolution string `json:"resolution,omitempty"` // "original", "1920x1080", etc
	FPS        string `json:"fps,omitempty"`        // "original", "30", "60", etc
	Bitrate    string `json:"bitrate,omitempty"`
}

// AudioConfig represents audio encoding configuration
type AudioConfig struct {
	Codec    string `json:"codec"`    // copy, aac, opus, mp3
	Bitrate  string `json:"bitrate,omitempty"`
	Channels int    `json:"channels,omitempty"`
}

// OutputConfig represents output file configuration
type OutputConfig struct {
	Container  string `json:"container"` // mp4, mkv, webm
	Suffix     string `json:"suffix"`    // filename suffix like "_h265"
	PathType   string `json:"pathType"`  // source, custom, default, overwrite
	CustomPath string `json:"customPath,omitempty"` // custom output directory
}

