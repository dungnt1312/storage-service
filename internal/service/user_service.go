package service

import (
	"errors"
	"storage-service/internal/model"
	"storage-service/internal/repository"

	"gorm.io/gorm"
)

type UserService struct {
	userRepo *repository.UserRepository
	fileRepo *repository.FileRepository
}

type UserStats struct {
	TotalFiles  int64 `json:"total_files"`
	TotalSize   int64 `json:"total_size"`
	MaxFiles    int64 `json:"max_files"`
	MaxFileSize int64 `json:"max_file_size"`
	MaxStorage  int64 `json:"max_storage"`
}

type UserSettings struct {
	MaxFiles    int64 `json:"max_files"`
	MaxFileSize int64 `json:"max_file_size"`
	MaxStorage  int64 `json:"max_storage"`
}

func NewUserService(userRepo *repository.UserRepository, fileRepo *repository.FileRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
		fileRepo: fileRepo,
	}
}

func (s *UserService) Register(username, email string) (*model.User, error) {
	_, err := s.userRepo.FindByEmail(email)
	if err == nil {
		return nil, errors.New("email already registered")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	user := &model.User{
		Username: username,
		Email:    email,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) GetUserByID(id uint) (*model.User, error) {
	return s.userRepo.FindByID(id)
}

func (s *UserService) RegenerateAPIKey(userID uint) (*model.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	user.RegenerateAPIKey()
	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) GetUserStats(userID uint) (*UserStats, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	totalFiles, err := s.fileRepo.CountByUserID(userID)
	if err != nil {
		return nil, err
	}

	totalSize, err := s.fileRepo.GetTotalSizeByUserID(userID)
	if err != nil {
		return nil, err
	}

	return &UserStats{
		TotalFiles:  totalFiles,
		TotalSize:   totalSize,
		MaxFiles:    user.MaxFiles,
		MaxFileSize: user.MaxFileSize,
		MaxStorage:  user.MaxStorage,
	}, nil
}

func (s *UserService) GetUserSettings(userID uint) (*UserSettings, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	return &UserSettings{
		MaxFiles:    user.MaxFiles,
		MaxFileSize: user.MaxFileSize,
		MaxStorage:  user.MaxStorage,
	}, nil
}

func (s *UserService) UpdateUserSettings(userID uint, settings *UserSettings) (*UserSettings, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	// Validate settings
	if settings.MaxFiles > 0 {
		user.MaxFiles = settings.MaxFiles
	}
	if settings.MaxFileSize > 0 {
		user.MaxFileSize = settings.MaxFileSize
	}
	if settings.MaxStorage > 0 {
		user.MaxStorage = settings.MaxStorage
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return &UserSettings{
		MaxFiles:    user.MaxFiles,
		MaxFileSize: user.MaxFileSize,
		MaxStorage:  user.MaxStorage,
	}, nil
}

func (s *UserService) CheckUploadAllowed(userID uint, fileSize int64) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	// Check file size limit
	if fileSize > user.MaxFileSize {
		return errors.New("file size exceeds your limit")
	}

	// Check total files limit
	totalFiles, err := s.fileRepo.CountByUserID(userID)
	if err != nil {
		return err
	}
	if totalFiles >= user.MaxFiles {
		return errors.New("maximum number of files reached")
	}

	// Check total storage limit
	totalSize, err := s.fileRepo.GetTotalSizeByUserID(userID)
	if err != nil {
		return err
	}
	if totalSize+fileSize > user.MaxStorage {
		return errors.New("storage limit exceeded")
	}

	return nil
}
