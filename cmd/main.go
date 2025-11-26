package main

import (
	"fmt"
	"log"
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
	userService := service.NewUserService(userRepo)
	fileService := service.NewFileService(fileRepo, cfg.UploadPath, cfg.MaxFileSize, cfg.StorageURL)
	imageService := service.NewImageService(fileRepo, cfg.UploadPath, cfg.MaxFileSize, cfg.StorageURL)

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
			"status": "ok",
			"message": "File Upload Service is running",
		})
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

	// Start server
	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Starting server on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
