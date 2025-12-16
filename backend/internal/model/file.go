package model

import "time"

// FileInfo represents information about a file or directory
type FileInfo struct {
	Name    string    `json:"name"`
	Path    string    `json:"path"`
	IsDir   bool      `json:"isDir"`
	Size    int64     `json:"size"`
	ModTime time.Time `json:"modTime"`
	// Video specific fields (populated by ffprobe)
	Duration       *float64 `json:"duration,omitempty"`
	Width          *int     `json:"width,omitempty"`
	Height         *int     `json:"height,omitempty"`
	Codec          *string  `json:"codec,omitempty"`
	Bitrate        *int64   `json:"bitrate,omitempty"`
	FrameRate      *string  `json:"frameRate,omitempty"`
	PixelFormat    *string  `json:"pixelFormat,omitempty"`
	ColorSpace     *string  `json:"colorSpace,omitempty"`
	ColorTransfer  *string  `json:"colorTransfer,omitempty"`
	ColorPrimaries *string  `json:"colorPrimaries,omitempty"`
	IsHDR          *bool    `json:"isHDR,omitempty"`
	Profile        *string  `json:"profile,omitempty"`
	Level          *string  `json:"level,omitempty"`
}

// HardwareInfo represents available hardware acceleration options
type HardwareInfo struct {
	CPU     bool   `json:"cpu"`
	NVIDIA  bool   `json:"nvidia"`
	Intel   bool   `json:"intel"`
	AMD     bool   `json:"amd"`
	GPUName string `json:"gpuName,omitempty"`
}

