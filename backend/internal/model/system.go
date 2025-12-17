package model

import "time"

// HostInfo represents static system information
type HostInfo struct {
	Hostname        string `json:"hostname"`
	OS              string `json:"os"`
	Platform        string `json:"platform"`
	PlatformFamily  string `json:"platformFamily"`
	PlatformVersion string `json:"platformVersion"`
	KernelVersion   string `json:"kernelVersion"`
	Arch            string `json:"arch"`
	CPUModel        string `json:"cpuModel"`
	CPUCores        int    `json:"cpuCores"`
	TotalMemory     uint64 `json:"totalMemory"` // in bytes
}

// SystemUsage represents real-time system resource usage
type SystemUsage struct {
	Timestamp   time.Time `json:"timestamp"`
	CPUPercent  float64   `json:"cpuPercent"`
	MemoryUsage uint64    `json:"memoryUsage"` // in bytes
	MemoryTotal uint64    `json:"memoryTotal"` // in bytes
	MemoryPercent float64 `json:"memoryPercent"`
	Load1       float64   `json:"load1"`
	Load5       float64   `json:"load5"`
	Load15      float64   `json:"load15"`
}

// SystemHistory represents historical system usage data
type SystemHistory struct {
	Data []SystemUsage `json:"data"`
}

