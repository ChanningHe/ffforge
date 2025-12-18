package main

import (
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
)

// GetBundledFFmpegPath returns the path to bundled ffmpeg binary
// If bundled binary is not found or not executable, returns "ffmpeg" (system PATH)
func GetBundledFFmpegPath() string {
	// Get executable path
	exePath, err := os.Executable()
	if err != nil {
		return "ffmpeg" // Fallback to system PATH
	}

	// Get the directory containing the executable
	exeDir := filepath.Dir(exePath)

	var ffmpegPath string

	switch goruntime.GOOS {
	case "darwin":
		// On macOS, binaries are in Contents/Resources/ffmpeg/
		// The app structure is: FFForge.app/Contents/MacOS/ffforge-desktop
		// We want: FFForge.app/Contents/Resources/ffmpeg/ffmpeg
		resourceDir := filepath.Join(filepath.Dir(exeDir), "Resources", "ffmpeg")
		ffmpegPath = filepath.Join(resourceDir, "ffmpeg")

	case "windows":
		// On Windows, binaries are in the same directory as the .exe
		// or in a ffmpeg subdirectory
		ffmpegPath = filepath.Join(exeDir, "ffmpeg", "ffmpeg.exe")

	default:
		return "ffmpeg" // Unsupported OS, use system PATH
	}

	// Check if bundled ffmpeg exists and is executable
	if _, err := os.Stat(ffmpegPath); err == nil {
		if isExecutable(ffmpegPath) {
			return ffmpegPath
		}
	}

	// Fallback to system PATH
	return "ffmpeg"
}

// GetBundledFFprobePath returns the path to bundled ffprobe binary
// If bundled binary is not found or not executable, returns "ffprobe" (system PATH)
func GetBundledFFprobePath() string {
	// Get executable path
	exePath, err := os.Executable()
	if err != nil {
		return "ffprobe" // Fallback to system PATH
	}

	// Get the directory containing the executable
	exeDir := filepath.Dir(exePath)

	var ffprobePath string

	switch goruntime.GOOS {
	case "darwin":
		// On macOS, binaries are in Contents/Resources/ffmpeg/
		resourceDir := filepath.Join(filepath.Dir(exeDir), "Resources", "ffmpeg")
		ffprobePath = filepath.Join(resourceDir, "ffprobe")

	case "windows":
		// On Windows, binaries are in the same directory as the .exe
		// or in a ffmpeg subdirectory
		ffprobePath = filepath.Join(exeDir, "ffmpeg", "ffprobe.exe")

	default:
		return "ffprobe" // Unsupported OS, use system PATH
	}

	// Check if bundled ffprobe exists and is executable
	if _, err := os.Stat(ffprobePath); err == nil {
		if isExecutable(ffprobePath) {
			return ffprobePath
		}
	}

	// Fallback to system PATH
	return "ffprobe"
}

// isExecutable checks if a file exists and is executable
func isExecutable(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}

	// On Windows, we just check if file exists
	if goruntime.GOOS == "windows" {
		return !info.IsDir()
	}

	// On Unix-like systems, check executable permission
	return !info.IsDir() && (info.Mode()&0111 != 0)
}

// VerifyFFmpegAvailability checks if ffmpeg and ffprobe are available
// Returns the paths found and any error
func VerifyFFmpegAvailability(ffmpegPath, ffprobePath string) (string, string, error) {
	// Try ffmpeg
	if _, err := exec.LookPath(ffmpegPath); err != nil {
		// If bundled path failed, try system PATH
		if systemFFmpeg, err := exec.LookPath("ffmpeg"); err == nil {
			ffmpegPath = systemFFmpeg
		} else {
			return "", "", err
		}
	}

	// Try ffprobe
	if _, err := exec.LookPath(ffprobePath); err != nil {
		// If bundled path failed, try system PATH
		if systemFFprobe, err := exec.LookPath("ffprobe"); err == nil {
			ffprobePath = systemFFprobe
		} else {
			return ffmpegPath, "", err
		}
	}

	return ffmpegPath, ffprobePath, nil
}
