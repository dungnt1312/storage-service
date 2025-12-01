package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Username    string    `json:"username" gorm:"unique;not null"`
	Email       string    `json:"email" gorm:"unique;not null"`
	APIKey      string    `json:"api_key" gorm:"unique;not null;index"`
	MaxFiles    int64     `json:"max_files" gorm:"default:1000"`
	MaxFileSize int64     `json:"max_file_size" gorm:"default:10485760"`  // 10MB default
	MaxStorage  int64     `json:"max_storage" gorm:"default:1073741824"` // 1GB default
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Files       []File    `json:"files,omitempty" gorm:"foreignKey:UserID"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.APIKey == "" {
		u.APIKey = uuid.New().String()
	}
	return nil
}

func (u *User) RegenerateAPIKey() {
	u.APIKey = uuid.New().String()
}
