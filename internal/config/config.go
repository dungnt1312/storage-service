package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBDriver   string
	DBHost     string
	DBPort     string
	DBDatabase string
	DBUsername string
	DBPassword string
	ServerPort string
	UploadPath string
	MaxFileSize int64
	StorageURL string
}

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		return nil, fmt.Errorf("error loading .env file: %w", err)
	}

	maxFileSize, _ := strconv.ParseInt(getEnv("MAX_FILE_SIZE", "10485760"), 10, 64) // Default 10MB

	return &Config{
		DBDriver:   getEnv("DB_DRIVER", "postgres"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBDatabase: getEnv("DB_DATABASE", "storage_db"),
		DBUsername: getEnv("DB_USERNAME", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		UploadPath: getEnv("UPLOAD_PATH", "./uploads"),
		MaxFileSize: maxFileSize,
		StorageURL: getEnv("STORAGE_URL", "http://localhost:8080"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
