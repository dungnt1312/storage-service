package service

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"storage-service/internal/model"
	"storage-service/internal/repository"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/h2non/filetype"
)

type ImageService struct {
	fileRepo    *repository.FileRepository
	uploadPath  string
	maxFileSize int64
	storageURL  string
	maxWidth    int
	maxHeight   int
	jpegQuality int
}

func NewImageService(fileRepo *repository.FileRepository, uploadPath string, maxFileSize int64, storageURL string) *ImageService {
	return &ImageService{
		fileRepo:    fileRepo,
		uploadPath:  uploadPath,
		maxFileSize: maxFileSize,
		storageURL:  storageURL,
		maxWidth:    2048,  // Max width for optimization
		maxHeight:   2048,  // Max height for optimization
		jpegQuality: 85,    // JPEG quality (0-100)
	}
}

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/gif":  true,
}

func (s *ImageService) ValidateImage(fileHeader *multipart.FileHeader) error {
	// Check file size
	if fileHeader.Size > s.maxFileSize {
		return fmt.Errorf("file size exceeds maximum allowed size of %d bytes", s.maxFileSize)
	}

	// Open file to check actual content type
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes for type detection
	head := make([]byte, 512)
	_, err = file.Read(head)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Detect file type
	kind, err := filetype.Match(head)
	if err != nil {
		return errors.New("unable to determine file type")
	}

	// Check if it's an allowed image type
	mimeType := kind.MIME.Value
	if !allowedImageTypes[mimeType] {
		return fmt.Errorf("file type not allowed, only images (JPEG, PNG, GIF) are accepted")
	}

	return nil
}

func (s *ImageService) UploadImage(userID uint, fileHeader *multipart.FileHeader) (*model.File, error) {
	if err := s.ValidateImage(fileHeader); err != nil {
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

	// Open the uploaded file
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Read the entire file into memory for processing
	fileBytes, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Detect file type
	kind, _ := filetype.Match(fileBytes)
	mimeType := kind.MIME.Value

	// Process and optimize the image
	processedBytes, finalMimeType, err := s.processImage(fileBytes, mimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to process image: %w", err)
	}

	// Generate unique filename with appropriate extension
	ext := s.getExtensionForMimeType(finalMimeType)
	uniqueFilename := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, uniqueFilename)

	// Write the processed image to disk
	if err := os.WriteFile(filePath, processedBytes, 0644); err != nil {
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
		FileSize:     int64(len(processedBytes)),
		MimeType:     finalMimeType,
		URL:          fileURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		os.Remove(filePath) // Clean up on error
		return nil, fmt.Errorf("failed to save file metadata: %w", err)
	}

	return file, nil
}

func (s *ImageService) processImage(imageBytes []byte, mimeType string) ([]byte, string, error) {
	// Decode the image
	img, err := imaging.Decode(bytes.NewReader(imageBytes))
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Get image dimensions
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// Check if image needs to be resized
	needsResize := width > s.maxWidth || height > s.maxHeight

	var processedImg image.Image
	if needsResize {
		// Resize image maintaining aspect ratio
		processedImg = imaging.Fit(img, s.maxWidth, s.maxHeight, imaging.Lanczos)
	} else {
		processedImg = img
	}

	// Encode image based on original type
	var buf bytes.Buffer
	var finalMimeType string

	switch mimeType {
	case "image/png":
		// Encode as PNG
		err = png.Encode(&buf, processedImg)
		finalMimeType = "image/png"
	case "image/jpeg", "image/jpg":
		// Encode as JPEG with quality setting
		err = jpeg.Encode(&buf, processedImg, &jpeg.Options{Quality: s.jpegQuality})
		finalMimeType = "image/jpeg"
	case "image/gif":
		// For GIF, convert to JPEG to reduce size (GIF animation lost)
		err = jpeg.Encode(&buf, processedImg, &jpeg.Options{Quality: s.jpegQuality})
		finalMimeType = "image/jpeg"
	default:
		// Default to JPEG
		err = jpeg.Encode(&buf, processedImg, &jpeg.Options{Quality: s.jpegQuality})
		finalMimeType = "image/jpeg"
	}

	if err != nil {
		return nil, "", fmt.Errorf("failed to encode image: %w", err)
	}

	return buf.Bytes(), finalMimeType, nil
}

func (s *ImageService) getExtensionForMimeType(mimeType string) string {
	switch mimeType {
	case "image/png":
		return ".png"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	case "image/gif":
		return ".gif"
	default:
		return ".jpg"
	}
}

// GetImageInfo returns detailed information about an image
func (s *ImageService) GetImageInfo(fileID uint) (*model.File, map[string]interface{}, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, nil, err
	}

	// Generate URL
	relativePath := strings.TrimPrefix(file.FilePath, s.uploadPath+string(filepath.Separator))
	file.URL = fmt.Sprintf("%s/uploads/%s", s.storageURL, filepath.ToSlash(relativePath))

	// Read image to get dimensions
	img, err := imaging.Open(file.FilePath)
	if err != nil {
		// Return file info without dimensions if image can't be read
		return file, nil, nil
	}

	bounds := img.Bounds()
	info := map[string]interface{}{
		"width":  bounds.Dx(),
		"height": bounds.Dy(),
	}

	return file, info, nil
}
