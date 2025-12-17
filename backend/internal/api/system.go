package api

import (
	"ffmpeg-web/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SystemHandler struct {
	systemService *service.SystemService
}

func NewSystemHandler(systemService *service.SystemService) *SystemHandler {
	return &SystemHandler{
		systemService: systemService,
	}
}

// GetHostInfo handles GET /api/system/host
func (h *SystemHandler) GetHostInfo(c *gin.Context) {
	info, err := h.systemService.GetHostInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// GetUsage handles GET /api/system/usage
func (h *SystemHandler) GetUsage(c *gin.Context) {
	usage := h.systemService.GetCurrentUsage()
	if usage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "No usage data available yet"})
		return
	}
	c.JSON(http.StatusOK, usage)
}

// GetHistory handles GET /api/system/history
func (h *SystemHandler) GetHistory(c *gin.Context) {
	history := h.systemService.GetHistory()
	c.JSON(http.StatusOK, gin.H{"data": history})
}

