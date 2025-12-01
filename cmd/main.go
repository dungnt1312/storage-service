package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"storage-service/internal/config"
	"storage-service/internal/handler"
	"storage-service/internal/middleware"
	"storage-service/internal/repository"
	"storage-service/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := repository.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	fileRepo := repository.NewFileRepository(db)

	// Initialize services
	userService := service.NewUserService(userRepo, fileRepo)
	fileService := service.NewFileService(fileRepo, userService, cfg.UploadPath, cfg.StorageURL)
	imageService := service.NewImageService(fileRepo, userService, cfg.UploadPath, cfg.StorageURL)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(userRepo)

	// Initialize handlers
	userHandler := handler.NewUserHandler(userService)
	fileHandler := handler.NewFileHandler(fileService)
	imageHandler := handler.NewImageHandler(imageService)

	// Setup router
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-API-Key")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "File Upload Service is running",
		})
	})

	// Redirect root to /app
	router.GET("/", func(c *gin.Context) {
		c.Redirect(302, "/app")
	})

	// API routes
	api := router.Group("/api")
	{
		userHandler.RegisterRoutes(api, authMiddleware.Authenticate())
		fileHandler.RegisterRoutes(api, authMiddleware.Authenticate())
		imageHandler.RegisterRoutes(api, authMiddleware.Authenticate())
	}

	// Serve static files (uploaded files)
	router.Static("/uploads", cfg.UploadPath)

	// Serve frontend app
	clientDist := "./client/dist"
	if _, err := os.Stat(clientDist); err == nil {
		router.GET("/app", func(c *gin.Context) {
			c.File(filepath.Join(clientDist, "index.html"))
		})
		router.GET("/app/*path", func(c *gin.Context) {
			path := c.Param("path")
			filePath := filepath.Join(clientDist, path)
			// Check if file exists (for assets)
			if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
				c.File(filePath)
			} else {
				// SPA fallback - serve index.html for all other routes
				c.File(filepath.Join(clientDist, "index.html"))
			}
		})
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Starting server on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
