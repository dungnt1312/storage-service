package service

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"storage-service/internal/model"
	"storage-service/internal/repository"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FileService struct {
	fileRepo    *repository.FileRepository
	uploadPath  string
	maxFileSize int64
	storageURL  string
}

func NewFileService(fileRepo *repository.FileRepository, uploadPath string, maxFileSize int64, storageURL string) *FileService {
	return &FileService{
		fileRepo:    fileRepo,
		uploadPath:  uploadPath,
		maxFileSize: maxFileSize,
		storageURL:  storageURL,
	}
}

var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".pdf":  true,
	".doc":  true,
	".docx": true,
	".txt":  true,
	".zip":  true,
}

func (s *FileService) ValidateFile(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > s.maxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d bytes", s.maxFileSize)
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedExtensions[ext] {
		return errors.New("file type not allowed")
	}

	return nil
}

func (s *FileService) UploadFile(userID uint, fileHeader *multipart.FileHeader) (*model.File, error) {
	if err := s.ValidateFile(fileHeader); err != nil {
		return nil, err
	}

	// Generate date-based folder structure: uploads/{user_id}/{YYYY-MM-DD}/
	now := time.Now()
	dateFolder := now.Format("2006-01-02")
	userFolder := fmt.Sprintf("%d", userID)
	uploadDir := filepath.Join(s.uploadPath, userFolder, dateFolder)

	// Create user/date directory if not exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(fileHeader.Filename)
	uniqueFilename := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, uniqueFilename)

	// Open the uploaded file
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(filePath) // Clean up on error
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Generate relative path for URL
	relativePath := filepath.Join(userFolder, dateFolder, uniqueFilename)
	fileURL := fmt.Sprintf("%s/uploads/%s", s.storageURL, filepath.ToSlash(relativePath))

	// Save file metadata to database
	file := &model.File{
		UserID:       userID,
		Filename:     uniqueFilename,
		OriginalName: fileHeader.Filename,
		FilePath:     filePath,
		FileSize:     fileHeader.Size,
		MimeType:     fileHeader.Header.Get("Content-Type"),
		URL:          fileURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		os.Remove(filePath) // Clean up on error
		return nil, fmt.Errorf("failed to save file metadata: %w", err)
	}

	return file, nil
}

func (s *FileService) GetFile(fileID uint) (*model.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}

	// Generate URL from file path
	s.generateFileURL(file)
	return file, nil
}

func (s *FileService) GetUserFiles(userID uint, page, pageSize int) ([]model.File, int64, error) {
	offset := (page - 1) * pageSize
	files, err := s.fileRepo.FindByUserID(userID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	// Generate URLs for all files
	for i := range files {
		s.generateFileURL(&files[i])
	}

	total, err := s.fileRepo.CountByUserID(userID)
	if err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

func (s *FileService) generateFileURL(file *model.File) {
	// Extract relative path from file path
	// FilePath format: ./uploads/{user_id}/{date}/{filename}
	relativePath := strings.TrimPrefix(file.FilePath, s.uploadPath+string(filepath.Separator))
	file.URL = fmt.Sprintf("%s/uploads/%s", s.storageURL, filepath.ToSlash(relativePath))
}

func (s *FileService) DeleteFile(fileID, userID uint) error {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return err
	}

	// Check if file belongs to user
	if file.UserID != userID {
		return errors.New("unauthorized to delete this file")
	}

	// Delete physical file
	if err := os.Remove(file.FilePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete physical file: %w", err)
	}

	// Delete from database
	if err := s.fileRepo.Delete(file); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	return nil
}
