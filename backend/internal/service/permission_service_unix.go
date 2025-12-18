//go:build unix || darwin || linux

package service

import (
	"ffmpeg-web/internal/model"
	"fmt"
	"log"
	"os"
	"syscall"
)

// getFileOwnership returns the uid and gid of a file (Unix implementation)
func getFileOwnership(filePath string) (uid int, gid int, err error) {
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to stat file: %w", err)
	}

	stat, ok := fileInfo.Sys().(*syscall.Stat_t)
	if !ok {
		return 0, 0, fmt.Errorf("failed to get file stat")
	}

	return int(stat.Uid), int(stat.Gid), nil
}

// applyFilePermissions applies file permissions based on settings (Unix implementation)
func applyFilePermissions(outputFile string, sourceFile string, settings *model.Settings) (bool, error) {
	log.Printf("Applying file permissions: mode=%s, sourceFile=%s, outputFile=%s",
		settings.FilePermissionMode, sourceFile, outputFile)

	ps := &PermissionService{}

	switch settings.FilePermissionMode {
	case model.FilePermissionSameAsSource:
		// Read source file's uid/gid
		uid, gid, err := ps.GetFileOwnership(sourceFile)
		if err != nil {
			return false, fmt.Errorf("failed to get source file ownership: %w", err)
		}

		// Get current output file's ownership
		currentUID, currentGID, err := ps.GetFileOwnership(outputFile)
		if err != nil {
			return false, fmt.Errorf("failed to get output file ownership: %w", err)
		}

		// Check if chown is needed
		if currentUID != uid || currentGID != gid {
			log.Printf("Changing ownership of %s from %d:%d to %d:%d (same as source)",
				outputFile, currentUID, currentGID, uid, gid)

			if err := os.Chown(outputFile, uid, gid); err != nil {
				return false, fmt.Errorf("failed to chown output file: %w", err)
			}

			log.Printf("Successfully changed ownership of %s to %d:%d", outputFile, uid, gid)
			return true, nil
		}

		log.Printf("Output file %s already has correct ownership %d:%d", outputFile, currentUID, currentGID)
		return false, nil

	case model.FilePermissionSpecify:
		// Use specified uid/gid
		uid := settings.FilePermissionUID
		gid := settings.FilePermissionGID

		// Get current output file's ownership
		currentUID, currentGID, err := ps.GetFileOwnership(outputFile)
		if err != nil {
			return false, fmt.Errorf("failed to get output file ownership: %w", err)
		}

		// Check if chown is needed
		if currentUID != uid || currentGID != gid {
			log.Printf("Changing ownership of %s from %d:%d to %d:%d (specified)",
				outputFile, currentUID, currentGID, uid, gid)

			if err := os.Chown(outputFile, uid, gid); err != nil {
				return false, fmt.Errorf("failed to chown output file: %w", err)
			}

			log.Printf("Successfully changed ownership of %s to %d:%d", outputFile, uid, gid)
			return true, nil
		}

		log.Printf("Output file %s already has correct ownership %d:%d", outputFile, currentUID, currentGID)
		return false, nil

	case model.FilePermissionNoAction:
		// Do nothing
		log.Printf("No action taken for file permissions (mode: no_action)")
		return false, nil

	default:
		return false, fmt.Errorf("unknown file permission mode: %s", settings.FilePermissionMode)
	}
}

