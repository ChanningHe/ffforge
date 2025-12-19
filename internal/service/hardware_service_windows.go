//go:build windows

package service

import (
	"log"
	"os/exec"
	"strings"
)

// isVirtualGPU checks if a GPU name represents a virtual/software device
func isVirtualGPU(name string) bool {
	nameLower := strings.ToLower(name)
	virtualKeywords := []string{
		"remote",
		"microsoft basic",
		"parallels",
		"vmware",
		"virtualbox",
		"virtual",
		"software",
		"render",
	}

	for _, keyword := range virtualKeywords {
		if strings.Contains(nameLower, keyword) {
			return true
		}
	}
	return false
}

// detectIntelQSVPlatform checks if Intel Quick Sync Video is available (Windows)
func detectIntelQSVPlatform() bool {
	// On Windows, check if Intel GPU is present via PowerShell
	// WMIC is deprecated in Windows 10+, use PowerShell instead

	// Try PowerShell first (modern method)
	cmd := exec.Command("powershell", "-Command", "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name")
	output, err := cmd.Output()
	if err == nil {
		outputStr := string(output)
		log.Printf("Windows GPU detection: All devices:\n%s", outputStr)

		// Check each line separately
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			lineLower := strings.ToLower(line)
			// Check if it's an Intel GPU and not virtual
			if strings.Contains(lineLower, "intel") && !isVirtualGPU(line) {
				log.Printf("✓ Intel GPU detected: %s", line)
				return true
			}
		}
	}

	log.Println("Intel GPU not detected on Windows")
	return false
}

// detectNVIDIAPlatform checks if NVIDIA GPU hardware exists (Windows)
func detectNVIDIAPlatform() bool {
	// Try PowerShell first (modern method)
	cmd := exec.Command("powershell", "-Command", "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name")
	output, err := cmd.Output()
	if err == nil {
		outputStr := string(output)

		// Check each line separately
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			lineLower := strings.ToLower(line)
			// Check if it's an NVIDIA GPU and not virtual
			if (strings.Contains(lineLower, "nvidia") || strings.Contains(lineLower, "geforce") || strings.Contains(lineLower, "quadro")) &&
				!isVirtualGPU(line) {
				log.Printf("✓ NVIDIA GPU detected: %s", line)
				return true
			}
		}
	}

	log.Println("NVIDIA GPU not detected on Windows")
	return false
}

// detectAMDPlatform checks if AMD GPU is available (Windows)
func detectAMDPlatform() bool {
	// Try PowerShell first (modern method)
	cmd := exec.Command("powershell", "-Command", "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name")
	output, err := cmd.Output()
	if err == nil {
		outputStr := string(output)

		// Check each line separately
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}

			lineLower := strings.ToLower(line)
			// Check if it's an AMD GPU and not virtual
			if (strings.Contains(lineLower, "amd") || strings.Contains(lineLower, "radeon")) && !isVirtualGPU(line) {
				log.Printf("✓ AMD GPU detected: %s", line)
				return true
			}
		}
	}

	log.Println("AMD GPU not detected on Windows")
	return false
}
