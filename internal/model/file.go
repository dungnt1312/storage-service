package model

import (
	"time"
)

type File struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null;index"`
	Filename     string    `json:"filename" gorm:"not null"`
	OriginalName string    `json:"original_name" gorm:"not null"`
	FilePath     string    `json:"file_path" gorm:"not null"`
	FolderPath   string    `json:"folder_path" gorm:"default:''"` // Virtual folder path for organization
	FileSize     int64     `json:"file_size" gorm:"not null"`
	MimeType     string    `json:"mime_type" gorm:"not null"`
	URL          string    `json:"url" gorm:"-"`
	CreatedAt    time.Time `json:"created_at"`
}
