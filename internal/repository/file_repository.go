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

func (r *FileRepository) FindByUserIDAndFolder(userID uint, folderPath string, limit, offset int, sortBy, sortOrder string) ([]model.File, error) {
	var files []model.File
	query := r.db.Where("user_id = ? AND folder_path = ?", userID, folderPath)
	
	// Validate and apply sort
	allowedSortFields := map[string]string{
		"name":       "original_name",
		"size":       "file_size",
		"created_at": "created_at",
		"updated_at": "updated_at",
	}
	sortField, ok := allowedSortFields[sortBy]
	if !ok {
		sortField = "created_at"
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}
	
	if err := query.Order(sortField + " " + sortOrder).Limit(limit).Offset(offset).Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

func (r *FileRepository) CountByUserIDAndFolder(userID uint, folderPath string) (int64, error) {
	var count int64
	if err := r.db.Model(&model.File{}).Where("user_id = ? AND folder_path = ?", userID, folderPath).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *FileRepository) CountByUserID(userID uint) (int64, error) {
	var count int64
	if err := r.db.Model(&model.File{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *FileRepository) GetTotalSizeByUserID(userID uint) (int64, error) {
	var total int64
	if err := r.db.Model(&model.File{}).Where("user_id = ?", userID).Select("COALESCE(SUM(file_size), 0)").Scan(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (r *FileRepository) GetFoldersByUserID(userID uint) ([]string, error) {
	var folders []string
	if err := r.db.Model(&model.File{}).Where("user_id = ?", userID).
		Distinct("folder_path").Pluck("folder_path", &folders).Error; err != nil {
		return nil, err
	}
	return folders, nil
}

func (r *FileRepository) Delete(file *model.File) error {
	return r.db.Delete(file).Error
}

func (r *FileRepository) Update(file *model.File) error {
	return r.db.Save(file).Error
}

func (r *FileRepository) FindByUserIDAndFolderPrefix(userID uint, folderPrefix string) ([]model.File, error) {
	var files []model.File
	query := r.db.Where("user_id = ?", userID)
	if folderPrefix != "" {
		query = query.Where("folder_path = ? OR folder_path LIKE ?", folderPrefix, folderPrefix+"/%")
	} else {
		query = query.Where("folder_path = ?", "")
	}
	if err := query.Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}

func (r *FileRepository) UpdateFolderPath(userID uint, oldPath, newPath string) error {
	// Update exact matches
	if err := r.db.Model(&model.File{}).
		Where("user_id = ? AND folder_path = ?", userID, oldPath).
		Update("folder_path", newPath).Error; err != nil {
		return err
	}
	
	// Update children paths (replace prefix)
	if oldPath != "" {
		oldPrefix := oldPath + "/"
		newPrefix := newPath + "/"
		// Use REPLACE function for PostgreSQL compatibility
		return r.db.Exec(
			"UPDATE files SET folder_path = REPLACE(folder_path, ?, ?) WHERE user_id = ? AND folder_path LIKE ?",
			oldPrefix, newPrefix, userID, oldPrefix+"%",
		).Error
	}
	return nil
}

func (r *FileRepository) DeleteByFolderPath(userID uint, folderPath string) ([]model.File, error) {
	var files []model.File
	query := r.db.Where("user_id = ?", userID)
	if folderPath != "" {
		query = query.Where("folder_path = ? OR folder_path LIKE ?", folderPath, folderPath+"/%")
	}
	if err := query.Find(&files).Error; err != nil {
		return nil, err
	}
	
	if len(files) > 0 {
		if err := query.Delete(&model.File{}).Error; err != nil {
			return nil, err
		}
	}
	
	return files, nil
}
