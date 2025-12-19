package api

import (
	"ffmpeg-web/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// FilesHandler handles file-related API requests
type FilesHandler struct {
	fileService   *service.FileService
	ffmpegService *service.FFmpegService
}

// NewFilesHandler creates a new files handler
func NewFilesHandler(fileService *service.FileService, ffmpegService *service.FFmpegService) *FilesHandler {
	return &FilesHandler{
		fileService:   fileService,
		ffmpegService: ffmpegService,
	}
}

// BrowseDirectory handles GET /api/files/browse
func (h *FilesHandler) BrowseDirectory(c *gin.Context) {
	path := c.DefaultQuery("path", "")

	files, err := h.fileService.BrowseDirectory(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, files)
}

// GetDefaultPath handles GET /api/files/default-path
func (h *FilesHandler) GetDefaultPath(c *gin.Context) {
	defaultPath, err := h.fileService.GetDefaultPath()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"defaultPath": defaultPath})
}

// GetFileInfo handles GET /api/files/info
func (h *FilesHandler) GetFileInfo(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "path parameter is required"})
		return
	}

	// Get basic file info from service
	info, err := h.fileService.GetFileInfo(path)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// If it's a video file, get detailed metadata using ffprobe
	if !info.IsDir {
		fullPath, err := h.fileService.GetFullPath(path)
		if err == nil {
			videoInfo, err := h.ffmpegService.ProbeFile(fullPath)
			if err == nil {
				// Create copies of values to get pointers
				duration := videoInfo.Duration
				width := videoInfo.Width
				height := videoInfo.Height
				codec := videoInfo.Codec
				bitrate := videoInfo.Bitrate
				frameRate := videoInfo.FrameRate
				pixelFormat := videoInfo.PixelFormat
				colorSpace := videoInfo.ColorSpace
				colorTransfer := videoInfo.ColorTransfer
				colorPrimaries := videoInfo.ColorPrimaries
				isHDR := videoInfo.IsHDR
				profile := videoInfo.Profile
				level := videoInfo.Level

				info.Duration = &duration
				info.Width = &width
				info.Height = &height
				info.Codec = &codec
				info.Bitrate = &bitrate
				info.FrameRate = &frameRate
				info.PixelFormat = &pixelFormat
				info.ColorSpace = &colorSpace
				info.ColorTransfer = &colorTransfer
				info.ColorPrimaries = &colorPrimaries
				info.IsHDR = &isHDR
				info.Profile = &profile
				info.Level = &level
			}
		}
	}

	c.JSON(http.StatusOK, info)
}
