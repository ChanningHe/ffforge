package service

import (
	"bufio"
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
	// First check if FFmpeg supports AMF encoders
	// This works on all platforms (Windows, Linux with ROCm)
	cmd := exec.Command("ffmpeg", "-hide_banner", "-encoders")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	outputStr := string(output)
	hasAMFEncoder := strings.Contains(outputStr, "hevc_amf") || strings.Contains(outputStr, "h264_amf")

	if !hasAMFEncoder {
		return false
	}

	// On Linux, we need to differentiate AMD from Intel using vainfo
	// Both use /dev/dri devices, but vainfo output differs
	if _, err := os.Stat("/dev/dri"); err == nil {
		// Linux system with DRI
		// Use vainfo to check if it's AMD GPU
		if isAMDGPU := hs.isAMDGPUViaVAInfo(); isAMDGPU {
			return true
		}
		// If vainfo doesn't detect AMD, but AMF encoder exists,
		// might be using proprietary driver or ROCm
		return hasAMFEncoder
	}

	// On Windows/macOS, if AMF encoder exists, it's AMD
	return hasAMFEncoder
}

// isAMDGPUViaVAInfo checks if the GPU is AMD by parsing vainfo output
func (hs *HardwareService) isAMDGPUViaVAInfo() bool {
	cmd := exec.Command("vainfo")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	outputStr := strings.ToLower(string(output))

	// AMD GPUs typically show as "AMD", "Radeon", or "AMDGPU" in vainfo
	// Intel shows as "Intel", "i965", "iHD"
	return strings.Contains(outputStr, "amd") ||
		strings.Contains(outputStr, "radeon") ||
		strings.Contains(outputStr, "amdgpu driver")
}

// GetGPUCapabilities returns GPU encoding and decoding capabilities
func (hs *HardwareService) GetGPUCapabilities() *model.GPUCapabilities {
	caps := &model.GPUCapabilities{}

	// Check Intel VA-API
	if vaInfo := hs.getIntelVAInfo(); vaInfo != nil {
		caps.HasIntelVA = true
		caps.IntelVA = vaInfo
	}

	// Check NVIDIA
	caps.HasNVIDIA = hs.detectNVIDIA()

	// Check AMD
	caps.HasAMD = hs.detectAMD()

	return caps
}

// getIntelVAInfo parses vainfo output to get Intel VA-API capabilities
func (hs *HardwareService) getIntelVAInfo() *model.VAInfo {
	cmd := exec.Command("vainfo")
	output, err := cmd.Output()
	if err != nil {
		return nil
	}

	info := &model.VAInfo{
		DecodeProfiles: []string{},
		EncodeProfiles: []string{},
	}

	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Count profiles and entrypoints
		if strings.Contains(line, "VAProfile") {
			info.ProfileCount++

			// Parse profile details
			if strings.Contains(line, "VAEntrypointVLD") {
				// Decode profile
				profile := extractProfileName(line)
				if profile != "" {
					info.DecodeProfiles = append(info.DecodeProfiles, profile)
				}
			} else if strings.Contains(line, "VAEntrypointEncSlice") ||
				strings.Contains(line, "VAEntrypointEncSliceLP") {
				// Encode profile
				profile := extractProfileName(line)
				if profile != "" {
					info.EncodeProfiles = append(info.EncodeProfiles, profile)
				}
			}
		}
		if strings.Contains(line, "VAEntrypoint") {
			info.EntrypointCount++
		}
	}

	// Remove duplicates
	info.DecodeProfiles = unique(info.DecodeProfiles)
	info.EncodeProfiles = unique(info.EncodeProfiles)

	if info.ProfileCount == 0 {
		return nil
	}

	return info
}

// extractProfileName extracts the codec profile name from vainfo line
func extractProfileName(line string) string {
	// Example: "VAProfileH264Main: VAEntrypointVLD"
	parts := strings.Split(line, ":")
	if len(parts) < 2 {
		return ""
	}

	profile := strings.TrimSpace(parts[0])
	// Remove VAProfile prefix
	profile = strings.TrimPrefix(profile, "VAProfile")

	// Clean up common profile names
	profile = strings.ReplaceAll(profile, "H264", "H.264")
	profile = strings.ReplaceAll(profile, "HEVC", "H.265/HEVC")
	profile = strings.ReplaceAll(profile, "VP8", "VP8")
	profile = strings.ReplaceAll(profile, "VP9", "VP9")
	profile = strings.ReplaceAll(profile, "AV1", "AV1")
	profile = strings.ReplaceAll(profile, "JPEG", "JPEG")

	return profile
}

// unique removes duplicate strings from a slice
func unique(slice []string) []string {
	keys := make(map[string]bool)
	result := []string{}
	for _, entry := range slice {
		if _, exists := keys[entry]; !exists {
			keys[entry] = true
			result = append(result, entry)
		}
	}
	return result
}
