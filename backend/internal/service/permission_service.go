package service

import (
	"ffmpeg-web/internal/model"
)

// PermissionService handles file permission operations
type PermissionService struct{}

// NewPermissionService creates a new permission service
func NewPermissionService() *PermissionService {
	return &PermissionService{}
}

// GetFileOwnership returns the uid and gid of a file
// Platform-specific implementation in permission_service_unix.go and permission_service_windows.go
func (ps *PermissionService) GetFileOwnership(filePath string) (uid int, gid int, err error) {
	return getFileOwnership(filePath)
}

// ApplyFilePermissions applies file permissions based on settings
// Platform-specific implementation in permission_service_unix.go and permission_service_windows.go
func (ps *PermissionService) ApplyFilePermissions(outputFile string, sourceFile string, settings *model.Settings) (bool, error) {
	return applyFilePermissions(outputFile, sourceFile, settings)
}
