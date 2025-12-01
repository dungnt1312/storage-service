package handler

import (
	"net/http"
	"storage-service/internal/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	imageService *service.ImageService
}

func NewImageHandler(imageService *service.ImageService) *ImageHandler {
	return &ImageHandler{imageService: imageService}
}

func (h *ImageHandler) UploadImage(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image is required"})
		return
	}

	folderPath := c.PostForm("folder_path")

	uploadedFile, err := h.imageService.UploadImageWithFolder(userID.(uint), file, folderPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Image uploaded and optimized successfully",
		"file":    uploadedFile,
	})
}

func (h *ImageHandler) GetImageInfo(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	fileID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	file, info, err := h.imageService.GetImageInfo(uint(fileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

	// Check if file belongs to user
	if file.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	response := gin.H{
		"file": file,
	}

	if info != nil {
		response["info"] = info
	}

	c.JSON(http.StatusOK, response)
}

func (h *ImageHandler) RegisterRoutes(router *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	protected := router.Group("")
	protected.Use(authMiddleware)
	{
		protected.POST("/upload-image", h.UploadImage)
		protected.GET("/images/:id", h.GetImageInfo)
	}
}
