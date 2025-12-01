package service

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"storage-service/internal/model"
	"storage-service/internal/repository"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Dangerous file extensions that should never be allowed
var dangerousExtensions = map[string]bool{
	".exe": true, ".bat": true, ".cmd": true, ".com": true,
	".msi": true, ".scr": true, ".pif": true, ".vbs": true,
	".vbe": true, ".js": true, ".jse": true, ".ws": true,
	".wsf": true, ".wsc": true, ".wsh": true, ".ps1": true,
	".ps2": true, ".psc1": true, ".psc2": true, ".msc": true,
	".msp": true, ".lnk": true, ".inf": true, ".reg": true,
	".dll": true, ".cpl": true, ".hta": true, ".jar": true,
	".sh": true, ".bash": true, ".zsh": true, ".php": true,
	".asp": true, ".aspx": true, ".jsp": true, ".py": true,
	".pl": true, ".rb": true, ".cgi": true, ".htaccess": true,
}

// Dangerous MIME types
var dangerousMimeTypes = map[string]bool{
	"application/x-msdownload":       true,
	"application/x-executable":       true,
	"application/x-msdos-program":    true,
	"application/x-sh":               true,
	"application/x-shellscript":      true,
	"application/x-php":              true,
	"application/x-httpd-php":        true,
	"text/x-php":                     true,
	"application/x-perl":             true,
	"application/x-python":           true,
	"application/x-ruby":             true,
	"application/java-archive":       true,
	"application/x-java-class":       true,
	"application/javascript":         true,
	"text/javascript":                true,
	"application/x-javascript":       true,
	"text/vbscript":                  true,
	"application/x-powershell":       true,
}

type FileService struct {
	fileRepo    *repository.FileRepository
	userService *UserService
	uploadPath  string
	storageURL  string
}

func NewFileService(fileRepo *repository.FileRepository, userService *UserService, uploadPath string, storageURL string) *FileService {
	return &FileService{
		fileRepo:    fileRepo,
		userService: userService,
		uploadPath:  uploadPath,
		storageURL:  storageURL,
	}
}

func (s *FileService) ValidateFile(userID uint, fileHeader *multipart.FileHeader) error {
	// Check user limits
	if err := s.userService.CheckUploadAllowed(userID, fileHeader.Size); err != nil {
		return err
	}

	// Check dangerous file extensions
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if dangerousExtensions[ext] {
		return errors.New("file type not allowed for security reasons")
	}

	// Check filename for path traversal attempts
	if strings.Contains(fileHeader.Filename, "..") || 
	   strings.Contains(fileHeader.Filename, "/") || 
	   strings.Contains(fileHeader.Filename, "\\") {
		return errors.New("invalid filename")
	}

	// Verify actual content type by reading file header
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("failed to open file for validation: %w", err)
	}
	defer file.Close()

	// Read first 512 bytes to detect content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file for validation: %w", err)
	}

	// Detect content type from actual file content
	detectedType := http.DetectContentType(buffer[:n])

	// Check if detected type is dangerous
	if dangerousMimeTypes[detectedType] {
		return errors.New("file content type not allowed for security reasons")
	}

	// Check for HTML/SVG that might contain scripts
	if strings.Contains(detectedType, "html") || strings.Contains(detectedType, "svg") {
		contentStr := strings.ToLower(string(buffer[:n]))
		if strings.Contains(contentStr, "<script") || 
		   strings.Contains(contentStr, "javascript:") ||
		   strings.Contains(contentStr, "onerror=") ||
		   strings.Contains(contentStr, "onload=") {
			return errors.New("file contains potentially dangerous content")
		}
	}

	return nil
}

func (s *FileService) UploadFile(userID uint, fileHeader *multipart.FileHeader) (*model.File, error) {
	return s.UploadFileWithFolder(userID, fileHeader, "")
}

func (s *FileService) UploadFileWithFolder(userID uint, fileHeader *multipart.FileHeader, folderPath string) (*model.File, error) {
	if err := s.ValidateFile(userID, fileHeader); err != nil {
		return nil, err
	}

	// Sanitize folder path
	folderPath = s.sanitizeFolderPath(folderPath)

	// Generate date-based folder structure: uploads/{user_id}/{YYYY-MM-DD}/
	now := time.Now()
	dateFolder := now.Format("2006-01-02")
	userFolder := fmt.Sprintf("%d", userID)
	uploadDir := filepath.Join(s.uploadPath, userFolder, dateFolder)

	// Create user/date directory if not exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename with sanitized extension
	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".bin" // Default extension for unknown types
	}
	uniqueFilename := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, uniqueFilename)

	// Open the uploaded file
	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file with restricted permissions
	dst, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Generate relative path for URL
	relativePath := filepath.Join(userFolder, dateFolder, uniqueFilename)
	fileURL := fmt.Sprintf("%s/%s", strings.TrimSuffix(s.storageURL, "/"), filepath.ToSlash(relativePath))

	// Detect MIME type from file header content type or detect it
	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		// Re-read file to detect type
		f, _ := os.Open(filePath)
		if f != nil {
			buffer := make([]byte, 512)
			n, _ := f.Read(buffer)
			mimeType = http.DetectContentType(buffer[:n])
			f.Close()
		}
	}

	// Save file metadata to database
	file := &model.File{
		UserID:       userID,
		Filename:     uniqueFilename,
		OriginalName: s.sanitizeFilename(fileHeader.Filename),
		FilePath:     filePath,
		FolderPath:   folderPath,
		FileSize:     fileHeader.Size,
		MimeType:     mimeType,
		URL:          fileURL,
	}

	if err := s.fileRepo.Create(file); err != nil {
		os.Remove(filePath)
		return nil, fmt.Errorf("failed to save file metadata: %w", err)
	}

	return file, nil
}

func (s *FileService) sanitizeFolderPath(path string) string {
	// Remove leading/trailing slashes and whitespace
	path = strings.TrimSpace(path)
	path = strings.Trim(path, "/\\")
	
	// Remove any path traversal attempts
	path = strings.ReplaceAll(path, "..", "")
	path = strings.ReplaceAll(path, "//", "/")
	
	// Replace backslashes with forward slashes
	path = strings.ReplaceAll(path, "\\", "/")
	
	return path
}

func (s *FileService) sanitizeFilename(name string) string {
	// Remove path components
	name = filepath.Base(name)
	
	// Remove null bytes and other control characters
	var result strings.Builder
	for _, r := range name {
		if r >= 32 && r != 127 {
			result.WriteRune(r)
		}
	}
	
	return result.String()
}

func (s *FileService) GetFile(fileID uint) (*model.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}

	s.generateFileURL(file)
	return file, nil
}

func (s *FileService) GetUserFiles(userID uint, page, pageSize int) ([]model.File, int64, error) {
	offset := (page - 1) * pageSize
	files, err := s.fileRepo.FindByUserID(userID, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	for i := range files {
		s.generateFileURL(&files[i])
	}

	total, err := s.fileRepo.CountByUserID(userID)
	if err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

func (s *FileService) GetUserFilesByFolder(userID uint, folderPath string, page, pageSize int, sortBy, sortOrder string) ([]model.File, int64, error) {
	offset := (page - 1) * pageSize
	files, err := s.fileRepo.FindByUserIDAndFolder(userID, folderPath, pageSize, offset, sortBy, sortOrder)
	if err != nil {
		return nil, 0, err
	}

	for i := range files {
		s.generateFileURL(&files[i])
	}

	total, err := s.fileRepo.CountByUserIDAndFolder(userID, folderPath)
	if err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

func (s *FileService) generateFileURL(file *model.File) {
	relativePath := strings.TrimPrefix(file.FilePath, s.uploadPath+string(filepath.Separator))
	file.URL = fmt.Sprintf("%s/%s", strings.TrimSuffix(s.storageURL, "/"), filepath.ToSlash(relativePath))
}

func (s *FileService) GetFolders(userID uint) ([]string, error) {
	return s.fileRepo.GetFoldersByUserID(userID)
}

func (s *FileService) DeleteFile(fileID, userID uint) error {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return err
	}

	if file.UserID != userID {
		return errors.New("unauthorized to delete this file")
	}

	if err := os.Remove(file.FilePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete physical file: %w", err)
	}

	if err := s.fileRepo.Delete(file); err != nil {
		return fmt.Errorf("failed to delete file metadata: %w", err)
	}

	return nil
}

func (s *FileService) RenameFile(fileID, userID uint, newName string) (*model.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}

	if file.UserID != userID {
		return nil, errors.New("unauthorized to rename this file")
	}

	// Sanitize new name
	newName = s.sanitizeFilename(newName)
	if newName == "" {
		return nil, errors.New("invalid filename")
	}

	file.OriginalName = newName
	if err := s.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to rename file: %w", err)
	}

	s.generateFileURL(file)
	return file, nil
}

func (s *FileService) RenameFolder(userID uint, oldPath, newName string) error {
	oldPath = s.sanitizeFolderPath(oldPath)
	newName = s.sanitizeFilename(newName)
	
	if oldPath == "" || newName == "" {
		return errors.New("invalid folder path or name")
	}

	// Build new path
	parts := strings.Split(oldPath, "/")
	parts[len(parts)-1] = newName
	newPath := strings.Join(parts, "/")

	return s.fileRepo.UpdateFolderPath(userID, oldPath, newPath)
}

func (s *FileService) DeleteFolder(userID uint, folderPath string) error {
	folderPath = s.sanitizeFolderPath(folderPath)
	if folderPath == "" {
		return errors.New("cannot delete root folder")
	}

	// Get all files in folder
	files, err := s.fileRepo.DeleteByFolderPath(userID, folderPath)
	if err != nil {
		return fmt.Errorf("failed to delete folder: %w", err)
	}

	// Delete physical files
	for _, file := range files {
		os.Remove(file.FilePath)
	}

	return nil
}

func (s *FileService) MoveFile(fileID, userID uint, newFolderPath string) (*model.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}

	if file.UserID != userID {
		return nil, errors.New("unauthorized to move this file")
	}

	file.FolderPath = s.sanitizeFolderPath(newFolderPath)
	if err := s.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to move file: %w", err)
	}

	s.generateFileURL(file)
	return file, nil
}

// Text file editing
var editableTextTypes = map[string]bool{
	"text/plain":              true,
	"text/html":               true,
	"text/css":                true,
	"text/csv":                true,
	"text/xml":                true,
	"application/json":        true,
	"application/xml":         true,
	"text/markdown":           true,
	"application/x-yaml":      true,
	"text/yaml":               true,
}

func (s *FileService) IsEditable(file *model.File) bool {
	if editableTextTypes[file.MimeType] {
		return true
	}
	// Check by extension
	ext := strings.ToLower(filepath.Ext(file.OriginalName))
	editableExts := map[string]bool{
		".txt": true, ".md": true, ".json": true, ".xml": true,
		".html": true, ".css": true, ".csv": true, ".yaml": true,
		".yml": true, ".ini": true, ".conf": true, ".log": true,
	}
	return editableExts[ext]
}

func (s *FileService) GetFileContent(fileID, userID uint) (string, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return "", err
	}

	if file.UserID != userID {
		return "", errors.New("unauthorized to read this file")
	}

	if !s.IsEditable(file) {
		return "", errors.New("file is not editable")
	}

	// Limit file size for editing (max 1MB)
	if file.FileSize > 1024*1024 {
		return "", errors.New("file too large to edit")
	}

	content, err := os.ReadFile(file.FilePath)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	return string(content), nil
}

func (s *FileService) UpdateFileContent(fileID, userID uint, content string) (*model.File, error) {
	file, err := s.fileRepo.FindByID(fileID)
	if err != nil {
		return nil, err
	}

	if file.UserID != userID {
		return nil, errors.New("unauthorized to edit this file")
	}

	if !s.IsEditable(file) {
		return nil, errors.New("file is not editable")
	}

	// Write content to file
	if err := os.WriteFile(file.FilePath, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	// Update file size
	file.FileSize = int64(len(content))
	if err := s.fileRepo.Update(file); err != nil {
		return nil, fmt.Errorf("failed to update file metadata: %w", err)
	}

	s.generateFileURL(file)
	return file, nil
}
