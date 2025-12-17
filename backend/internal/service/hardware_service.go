package service

import (
	"ffmpeg-web/internal/model"
	"os"
	"os/exec"
	"strings"
)

// HardwareService handles hardware detection
type HardwareService struct{}

// NewHardwareService creates a new hardware service
func NewHardwareService() *HardwareService {
	return &HardwareService{}
}

// DetectHardware detects available hardware acceleration options
func (hs *HardwareService) DetectHardware() *model.HardwareInfo {
	info := &model.HardwareInfo{
		CPU: true, // CPU is always available
	}

	// Detect NVIDIA GPU
	info.NVIDIA = hs.detectNVIDIA()
	if info.NVIDIA {
		info.GPUName = hs.getNVIDIAGPUName()
	}

	// Detect Intel QSV
	info.Intel = hs.detectIntelQSV()

	// Detect AMD GPU
	info.AMD = hs.detectAMD()

	return info
}

// detectNVIDIA checks if NVIDIA GPU is available
func (hs *HardwareService) detectNVIDIA() bool {
	// Check for nvidia-smi
	cmd := exec.Command("nvidia-smi", "--query-gpu=name", "--format=csv,noheader")
	if err := cmd.Run(); err != nil {
		return false
	}

	// Check if FFmpeg supports CUDA/NVENC
	cmd = exec.Command("ffmpeg", "-hide_banner", "-encoders")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	outputStr := string(output)
	return strings.Contains(outputStr, "hevc_nvenc") || strings.Contains(outputStr, "h264_nvenc")
}

// getNVIDIAGPUName gets the NVIDIA GPU name
func (hs *HardwareService) getNVIDIAGPUName() string {
	cmd := exec.Command("nvidia-smi", "--query-gpu=name", "--format=csv,noheader")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	return strings.TrimSpace(string(output))
}

// detectIntelQSV checks if Intel Quick Sync Video is available
func (hs *HardwareService) detectIntelQSV() bool {
	// Check for /dev/dri/renderD* devices (Linux)
	entries, err := os.ReadDir("/dev/dri")
	if err != nil {
		return false
	}

	hasRenderDevice := false
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "renderD") {
			hasRenderDevice = true
			break
		}
	}

	if !hasRenderDevice {
		return false
	}

	// Check if FFmpeg supports QSV
	cmd := exec.Command("ffmpeg", "-hide_banner", "-encoders")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	outputStr := string(output)
	return strings.Contains(outputStr, "hevc_qsv") || strings.Contains(outputStr, "h264_qsv")
}

// detectAMD checks if AMD GPU acceleration is available
func (hs *HardwareService) detectAMD() bool {
	// Check if FFmpeg supports AMF
	cmd := exec.Command("ffmpeg", "-hide_banner", "-encoders")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	outputStr := string(output)
	return strings.Contains(outputStr, "hevc_amf") || strings.Contains(outputStr, "h264_amf")
}





