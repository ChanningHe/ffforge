//go:build windows

package service

import (
	"ffmpeg-web/internal/model"
	"log"
)

// getFileOwnership returns dummy values on Windows
// Windows uses a different permission model (ACLs), not uid/gid
func getFileOwnership(filePath string) (uid int, gid int, err error) {
	// Windows doesn't use uid/gid, return 0 values
	return 0, 0, nil
}

// applyFilePermissions is a no-op on Windows
// Windows uses Access Control Lists (ACLs) instead of Unix-style permissions
func applyFilePermissions(outputFile string, sourceFile string, settings *model.Settings) (bool, error) {
	log.Printf("File permission management not available on Windows (mode: %s)", settings.FilePermissionMode)
	log.Printf("Windows uses ACLs for file permissions - skipping Unix-style permission changes")
	return false, nil
}

