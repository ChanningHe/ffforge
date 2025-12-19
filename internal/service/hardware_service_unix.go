//go:build unix || darwin || linux

package service

import (
	"log"
	"os/exec"
	"strings"
)

// detectNVIDIAPlatform checks if NVIDIA GPU hardware exists (Unix/Linux)
func detectNVIDIAPlatform() bool {
	// Check for nvidia-smi
	cmd := exec.Command("nvidia-smi", "--query-gpu=name", "--format=csv,noheader")
	output, err := cmd.Output()
	if err != nil {
		log.Printf("NVIDIA detection: nvidia-smi not found or failed: %v", err)
		return false
	}

	gpuName := strings.TrimSpace(string(output))
	log.Printf("✓ NVIDIA GPU detected via nvidia-smi: %s", gpuName)
	return true
}

// detectIntelQSVPlatform checks if Intel Quick Sync Video is available (Unix/Linux)
func detectIntelQSVPlatform() bool {
	// Use vainfo to detect Intel VA-API driver
	cmd := exec.Command("vainfo")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("vainfo command failed (Intel check): %v", err)
		return false
	}

	outputStr := strings.ToLower(string(output))
	log.Printf("Unix GPU detection (Intel): vainfo output snippet:\n%s",
		strings.Join(strings.Split(string(output), "\n")[:5], "\n"))

	// Check for Intel driver indicators
	if strings.Contains(outputStr, "intel ihd driver") ||
		strings.Contains(outputStr, "intel i965 driver") ||
		strings.Contains(outputStr, "intel") && strings.Contains(outputStr, "driver") {
		log.Println("✓ Intel GPU with VA-API detected")
		return true
	}

	log.Println("Intel GPU not detected on Unix")
	return false
}

// detectAMDPlatform checks if AMD GPU is available (Unix/Linux)
func detectAMDPlatform() bool {
	// Use vainfo to detect AMD VA-API driver
	cmd := exec.Command("vainfo")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("vainfo command failed (AMD check): %v", err)
		return false
	}

	outputStr := strings.ToLower(string(output))

	// Check for AMD driver indicators
	if strings.Contains(outputStr, "amd") ||
		strings.Contains(outputStr, "radeon") ||
		strings.Contains(outputStr, "mesa gallium") && strings.Contains(outputStr, "amd") {
		log.Printf("✓ AMD GPU with VA-API detected")
		return true
	}

	log.Println("AMD GPU not detected on Unix")
	return false
}
