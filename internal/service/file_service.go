package service

import (
	"ffmpeg-web/internal/model"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileService handles file system operations
type FileService struct {
	dataPath            string
	allowFullFileSystem bool // For desktop app
}

// NewFileService creates a new file service
func NewFileService(dataPath string) *FileService {
	return &FileService{
		dataPath:            dataPath,
		allowFullFileSystem: false,
	}
}

// NewFileServiceWithFullAccess creates a file service with full filesystem access (for desktop app)
func NewFileServiceWithFullAccess(dataPath string) *FileService {
	return &FileService{
		dataPath:            dataPath,
		allowFullFileSystem: true,
	}
}

// GetDefaultPath returns the absolute path of the data directory
func (fs *FileService) GetDefaultPath() (string, error) {
	absPath, err := filepath.Abs(fs.dataPath)
	if err != nil {
		return "", fmt.Errorf("failed to get absolute path: %w", err)
	}
	return absPath, nil
}

// BrowseDirectory lists files and directories in the specified path
func (fs *FileService) BrowseDirectory(pathParam string) ([]*model.FileInfo, error) {
	var fullPath string

	// If empty path, use data path as default
	if pathParam == "" {
		fullPath = fs.dataPath
	} else {
		// Check if it's an absolute path
		if filepath.IsAbs(pathParam) {
			fullPath = pathParam
		} else {
			// Treat as relative path from data path
			cleanPath := filepath.Clean(pathParam)
			if strings.Contains(cleanPath, "..") {
				return nil, fmt.Errorf("invalid path: directory traversal not allowed")
			}
			fullPath = filepath.Join(fs.dataPath, cleanPath)
		}
	}

	// For web version, check if path is within data directory
	// For desktop version, allow full filesystem access
	if !fs.allowFullFileSystem {
		absFullPath, err := filepath.Abs(fullPath)
		if err != nil {
			return nil, fmt.Errorf("invalid path: %w", err)
		}

		absDataPath, err := filepath.Abs(fs.dataPath)
		if err != nil {
			return nil, fmt.Errorf("invalid data path: %w", err)
		}

		// Use filepath.Rel to ensure the path is within data directory
		// This prevents attacks like /data-secret when dataPath is /data
		relPath, err := filepath.Rel(absDataPath, absFullPath)
		if err != nil || strings.HasPrefix(relPath, "..") {
			return nil, fmt.Errorf("access denied: path outside data directory")
		}
	}

	// Read directory
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	files := make([]*model.FileInfo, 0, len(entries))
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue // Skip files we can't read
		}

		// Skip hidden files
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		// Build full absolute path for display
		fullItemPath := filepath.Join(fullPath, entry.Name())
		absItemPath, err := filepath.Abs(fullItemPath)
		if err != nil {
			absItemPath = fullItemPath
		}

		fileInfo := &model.FileInfo{
			Name:    entry.Name(),
			Path:    absItemPath, // Return full absolute path instead of relative
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime(),
		}

		// Only include video files and directories
		if !entry.IsDir() && !isVideoFile(entry.Name()) {
			continue
		}

		files = append(files, fileInfo)
	}

	return files, nil
}

// GetFullPath returns the full system path for a relative or absolute path
func (fs *FileService) GetFullPath(pathParam string) (string, error) {
	cleanPath := filepath.Clean(pathParam)
	if strings.Contains(cleanPath, "..") {
		return "", fmt.Errorf("invalid path: directory traversal not allowed")
	}

	var fullPath string
	// Check if it's already an absolute path
	if filepath.IsAbs(cleanPath) {
		fullPath = cleanPath
	} else {
		// Relative path, join with data path
		fullPath = filepath.Join(fs.dataPath, cleanPath)
	}

	absFullPath, err := filepath.Abs(fullPath)
	if err != nil {
		return "", fmt.Errorf("invalid path: %w", err)
	}

	absDataPath, err := filepath.Abs(fs.dataPath)
	if err != nil {
		return "", fmt.Errorf("invalid data path: %w", err)
	}

	// Use filepath.Rel to ensure the path is within data directory
	// This prevents attacks like /data-secret when dataPath is /data
	relPath, err := filepath.Rel(absDataPath, absFullPath)
	if err != nil || strings.HasPrefix(relPath, "..") {
		return "", fmt.Errorf("access denied: path outside data directory")
	}

	return absFullPath, nil
}

// GetFileInfo retrieves detailed information about a file including video metadata
func (fs *FileService) GetFileInfo(relativePath string) (*model.FileInfo, error) {
	fullPath, err := fs.GetFullPath(relativePath)
	if err != nil {
		return nil, err
	}

	fileInfo, err := os.Stat(fullPath)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	info := &model.FileInfo{
		Name:    fileInfo.Name(),
		Path:    relativePath,
		IsDir:   fileInfo.IsDir(),
		Size:    fileInfo.Size(),
		ModTime: fileInfo.ModTime(),
	}

	// If it's a video file, get metadata using ffprobe
	if !fileInfo.IsDir() && isVideoFile(fileInfo.Name()) {
		// Import ffprobe in the import section if not already
		// For now, we'll just return basic info
		// The ffprobe integration should be done in the API layer
	}

	return info, nil
}

// isVideoFile checks if a file has a video extension
func isVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	videoExts := []string{
		".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm",
		".m4v", ".mpg", ".mpeg", ".3gp", ".ts", ".m2ts", ".mts",
	}

	for _, videoExt := range videoExts {
		if ext == videoExt {
			return true
		}
	}

	return false
}
