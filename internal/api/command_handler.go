package api

import (
	"ffmpeg-web/internal/model"
	"ffmpeg-web/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CommandHandler handles command-related API requests
type CommandHandler struct {
	ffmpegService *service.FFmpegService
}

// NewCommandHandler creates a new command handler
func NewCommandHandler(ffmpegService *service.FFmpegService) *CommandHandler {
	return &CommandHandler{
		ffmpegService: ffmpegService,
	}
}

// PreviewRequest represents a request to preview ffmpeg command
type PreviewRequest struct {
	Config     model.TranscodeConfig `json:"config" binding:"required"`
	SourceFile string                `json:"sourceFile"` // Optional, used for path calculation
}

// PreviewResponse represents the command preview response
type PreviewResponse struct {
	Command string `json:"command"`
}

// PreviewCommand handles POST /api/command/preview
// Generates an ffmpeg command string based on the provided configuration
func (h *CommandHandler) PreviewCommand(c *gin.Context) {
	var req PreviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Use default source file if not provided
	sourceFile := req.SourceFile
	if sourceFile == "" {
		sourceFile = "input.mp4"
	}

	// Generate command preview
	commandArgs := h.ffmpegService.BuildCommandPreview(sourceFile, &req.Config)
	command := "ffmpeg " + joinArgs(commandArgs)

	c.JSON(http.StatusOK, PreviewResponse{
		Command: command,
	})
}

// joinArgs joins command arguments with proper quoting for display
func joinArgs(args []string) string {
	result := ""
	for i, arg := range args {
		if i > 0 {
			result += " "
		}
		// Quote arguments containing spaces or special characters
		if needsQuoting(arg) {
			result += "\"" + arg + "\""
		} else {
			result += arg
		}
	}
	return result
}

// needsQuoting checks if an argument needs to be quoted for display
func needsQuoting(s string) bool {
	for _, c := range s {
		if c == ' ' || c == '\t' || c == '"' || c == '\'' || c == '\\' {
			return true
		}
	}
	return false
}
