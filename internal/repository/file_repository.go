package repository

import (
	"storage-service/internal/model"

	"gorm.io/gorm"
)

type FileRepository struct {
	db *gorm.DB
}

func NewFileRepository(db *gorm.DB) *FileRepository {
	return &FileRepository{db: db}
}

func (r *FileRepository) Create(file *model.File) error {
	return r.db.Create(file).Error
}

func (r *FileRepository) FindByID(id uint) (*model.File, error) {
	var file model.File
	if err := r.db.First(&file, id).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

func (r *FileRepository) FindByUserID(userID uint, limit, offset int) ([]model.File, error) {
	var files []model.File
	if err := r.db.Where("user_id = ?", userID).Limit(limit).Offset(offset).Order("created_at DESC").Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

func (r *FileRepository) CountByUserID(userID uint) (int64, error) {
	var count int64
	if err := r.db.Model(&model.File{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *FileRepository) Delete(file *model.File) error {
	return r.db.Delete(file).Error
}
