package api

import (
	"ffmpeg-web/internal/database"
	"ffmpeg-web/internal/model"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// PresetsHandler handles preset-related API requests
type PresetsHandler struct {
	db *database.DB
}

// NewPresetsHandler creates a new presets handler
func NewPresetsHandler(db *database.DB) *PresetsHandler {
	return &PresetsHandler{
		db: db,
	}
}

// CreatePresetRequest represents a request to create a new preset
type CreatePresetRequest struct {
	Name        string                `json:"name" binding:"required"`
	Description string                `json:"description"`
	Config      model.TranscodeConfig `json:"config" binding:"required"`
}

// UpdatePresetRequest represents a request to update a preset
type UpdatePresetRequest struct {
	Name        string                `json:"name" binding:"required"`
	Description string                `json:"description"`
	Config      model.TranscodeConfig `json:"config" binding:"required"`
}

// GetAllPresets handles GET /api/presets
func (h *PresetsHandler) GetAllPresets(c *gin.Context) {
	presets, err := h.db.GetAllPresets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve presets"})
		return
	}

	c.JSON(http.StatusOK, presets)
}

// GetPreset handles GET /api/presets/:id
func (h *PresetsHandler) GetPreset(c *gin.Context) {
	id := c.Param("id")

	preset, err := h.db.GetPreset(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "preset not found"})
		return
	}

	c.JSON(http.StatusOK, preset)
}

// CreatePreset handles POST /api/presets
func (h *PresetsHandler) CreatePreset(c *gin.Context) {
	var req CreatePresetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	preset := &model.Preset{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Description: req.Description,
		Config:      req.Config,
		IsBuiltin:   false,
		CreatedAt:   time.Now(),
	}

	if err := h.db.CreatePreset(preset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create preset"})
		return
	}

	c.JSON(http.StatusOK, preset)
}

// UpdatePreset handles PUT /api/presets/:id
func (h *PresetsHandler) UpdatePreset(c *gin.Context) {
	id := c.Param("id")

	var req UpdatePresetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing preset to check if it exists and is not builtin
	existingPreset, err := h.db.GetPreset(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "preset not found"})
		return
	}

	if existingPreset.IsBuiltin {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot update builtin preset"})
		return
	}

	preset := &model.Preset{
		ID:          id,
		Name:        req.Name,
		Description: req.Description,
		Config:      req.Config,
		IsBuiltin:   false,
		CreatedAt:   existingPreset.CreatedAt,
	}

	if err := h.db.UpdatePreset(preset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update preset"})
		return
	}

	c.JSON(http.StatusOK, preset)
}

// DeletePreset handles DELETE /api/presets/:id
func (h *PresetsHandler) DeletePreset(c *gin.Context) {
	id := c.Param("id")

	if err := h.db.DeletePreset(id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "preset deleted"})
}




