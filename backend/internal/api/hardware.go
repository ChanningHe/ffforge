package api

import (
	"ffmpeg-web/internal/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// HardwareHandler handles hardware detection API requests
type HardwareHandler struct {
	hardwareService *service.HardwareService
}

// NewHardwareHandler creates a new hardware handler
func NewHardwareHandler(hardwareService *service.HardwareService) *HardwareHandler {
	return &HardwareHandler{
		hardwareService: hardwareService,
	}
}

// GetHardwareInfo handles GET /api/hardware
func (h *HardwareHandler) GetHardwareInfo(c *gin.Context) {
	info := h.hardwareService.DetectHardware()
	c.JSON(http.StatusOK, info)
}





