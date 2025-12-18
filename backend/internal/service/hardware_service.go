package service

import (
	"bufio"
	"context"
	"ffmpeg-web/internal/model"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// HardwareService handles hardware detection
type HardwareService struct {
	cache             *model.HardwareInfo
	capabilitiesCache *model.GPUCapabilities
	cacheMutex        sync.RWMutex
	cacheTime         time.Time
	cacheDuration     time.Duration
	ffmpegPath        string
}

// NewHardwareService creates a new hardware service
func NewHardwareService() *HardwareService {
	hs := &HardwareService{
		cacheDuration: 5 * time.Minute, // Cache for 5 minutes
		ffmpegPath:    "ffmpeg",        // Default to PATH
	}
	return hs
}

// SetFFmpegPath sets the FFmpeg binary path for hardware detection
func (hs *HardwareService) SetFFmpegPath(path string) {
	hs.ffmpegPath = path
	// Clear cache to force re-detection with new path
	hs.cacheMutex.Lock()
	hs.cache = nil
	hs.capabilitiesCache = nil
	hs.cacheMutex.Unlock()
	// Trigger background detection
	go hs.DetectHardware()
}

// DetectHardware detects available hardware acceleration options with caching
func (hs *HardwareService) DetectHardware() *model.HardwareInfo {
	// Check cache first
	hs.cacheMutex.RLock()
	if hs.cache != nil && time.Since(hs.cacheTime) < hs.cacheDuration {
		cached := hs.cache
		hs.cacheMutex.RUnlock()
		return cached
	}
	hs.cacheMutex.RUnlock()

	// Perform detection with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	info := &model.HardwareInfo{
		CPU: true, // CPU is always available
	}

	// Detect in parallel with timeout
	type result struct {
		nvidia  bool
		gpuName string
		intel   bool
		amd     bool
	}
	resultChan := make(chan result, 1)

	go func() {
		r := result{}
		r.nvidia = hs.detectNVIDIAWithTimeout(ctx)
		if r.nvidia {
			r.gpuName = hs.getNVIDIAGPUNameWithTimeout(ctx)
		}
		r.intel = hs.detectIntelQSVWithTimeout(ctx)
		r.amd = hs.detectAMDWithTimeout(ctx)
		resultChan <- r
	}()

	select {
	case r := <-resultChan:
		info.NVIDIA = r.nvidia
		info.GPUName = r.gpuName
		info.Intel = r.intel
		info.AMD = r.amd
	case <-ctx.Done():
		// Timeout - return CPU only
	}

	// Update cache
	hs.cacheMutex.Lock()
	hs.cache = info
	hs.cacheTime = time.Now()
	hs.cacheMutex.Unlock()

	return info
}

// detectNVIDIA checks if NVIDIA GPU is available
func (hs *HardwareService) detectNVIDIA() bool {
	return hs.detectNVIDIAWithTimeout(context.Background())
}

// detectNVIDIAWithTimeout checks if NVIDIA GPU is available with timeout
func (hs *HardwareService) detectNVIDIAWithTimeout(ctx context.Context) bool {
	// Check if NVIDIA hardware exists (platform-specific)
	if !detectNVIDIAPlatform() {
		return false
	}

	log.Println("✓ NVIDIA GPU enabled for encoding")
	return true
}

// getNVIDIAGPUName gets the NVIDIA GPU name
func (hs *HardwareService) getNVIDIAGPUName() string {
	return hs.getNVIDIAGPUNameWithTimeout(context.Background())
}

// getNVIDIAGPUNameWithTimeout gets the NVIDIA GPU name with timeout
func (hs *HardwareService) getNVIDIAGPUNameWithTimeout(ctx context.Context) string {
	cmd := exec.CommandContext(ctx, "nvidia-smi", "--query-gpu=name", "--format=csv,noheader")
	output, err := cmd.Output()
	if err != nil {
		return ""
	}

	return strings.TrimSpace(string(output))
}

// detectIntelQSV checks if Intel Quick Sync Video is available
func (hs *HardwareService) detectIntelQSV() bool {
	return hs.detectIntelQSVWithTimeout(context.Background())
}

// detectIntelQSVWithTimeout checks if Intel Quick Sync Video is available with timeout
func (hs *HardwareService) detectIntelQSVWithTimeout(ctx context.Context) bool {
	// Check if Intel hardware exists (platform-specific)
	if !detectIntelQSVPlatform() {
		return false
	}

	log.Println("✓ Intel GPU enabled for encoding")
	return true
}

// detectAMD checks if AMD GPU acceleration is available
func (hs *HardwareService) detectAMD() bool {
	return hs.detectAMDWithTimeout(context.Background())
}

// detectAMDWithTimeout checks if AMD GPU acceleration is available with timeout
func (hs *HardwareService) detectAMDWithTimeout(ctx context.Context) bool {
	// Check if AMD hardware exists (platform-specific)
	if !detectAMDPlatform() {
		return false
	}

	log.Println("✓ AMD GPU enabled for encoding")
	return true
}

// GetGPUCapabilities returns GPU encoding and decoding capabilities with caching
func (hs *HardwareService) GetGPUCapabilities() *model.GPUCapabilities {
	// Check cache first
	hs.cacheMutex.RLock()
	if hs.capabilitiesCache != nil && time.Since(hs.cacheTime) < hs.cacheDuration {
		cached := hs.capabilitiesCache
		hs.cacheMutex.RUnlock()
		return cached
	}
	hs.cacheMutex.RUnlock()

	caps := &model.GPUCapabilities{}

	// Check Intel
	// Unix/Linux: Use vainfo for detailed capabilities (helps distinguish Intel from AMD)
	// Windows: Just check if Intel GPU exists
	if vaInfo := hs.getIntelVAInfo(); vaInfo != nil {
		caps.HasIntelVA = true
		caps.IntelVA = vaInfo
	} else if hs.detectIntelQSV() {
		// Intel GPU detected via platform-specific method (e.g., Windows)
		caps.HasIntelVA = true
		caps.IntelVA = nil // No detailed VA-API info on Windows
	}

	// Check NVIDIA
	caps.HasNVIDIA = hs.detectNVIDIA()

	// Check AMD
	caps.HasAMD = hs.detectAMD()

	// Update cache with current timestamp
	hs.cacheMutex.Lock()
	hs.capabilitiesCache = caps
	hs.cacheTime = time.Now()
	hs.cacheMutex.Unlock()

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
