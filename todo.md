# TODO: File Upload Service với Golang & API Key Authentication

## Phase 1: Setup Project
- [ ] Khởi tạo Go module (`go mod init file-upload-service`)
- [ ] Cài đặt dependencies cần thiết:
  - `github.com/gorilla/mux` hoặc `github.com/gin-gonic/gin` (routing)
  - `github.com/google/uuid` (generate API keys)
  - `github.com/joho/godotenv` (environment variables)
  - Database driver (postgres/mysql/sqlite)
- [ ] Tạo cấu trúc thư mục:
  ```
  ├── cmd/
  │   └── main.go
  ├── internal/
  │   ├── handler/
  │   ├── middleware/
  │   ├── model/
  │   ├── repository/
  │   └── service/
  ├── uploads/
  ├── .env
  └── go.mod
  ```

## Phase 2: Database Setup (postgres)
- [ ] Thiết kế schema cho bảng `users`:
  - id, username, email, api_key, created_at, updated_at
- [ ] Thiết kế schema cho bảng `files`:
  - id, user_id, filename, original_name, file_path, file_size, mime_type, created_at
- [ ] Viết migration scripts hoặc dùng ORM (GORM)
- [ ] Tạo database connection pool

## Phase 3: API Key Management
- [ ] Tạo model `User` với field api_key
- [ ] Implement function generate API key (UUID hoặc random string)
- [ ] API endpoint: POST `/api/users/register` - đăng ký user mới và tạo API key
- [ ] API endpoint: GET `/api/users/me` - lấy thông tin user (kèm API key)
- [ ] API endpoint: POST `/api/users/regenerate-key` - tạo lại API key mới

## Phase 4: Authentication Middleware
- [ ] Tạo middleware `AuthMiddleware` để validate API key:
  - Đọc API key từ header `X-API-Key`
  - Kiểm tra API key có tồn tại trong database
  - Inject user info vào context
- [ ] Áp dụng middleware cho các protected routes

## Phase 5: File Upload Implementation
- [ ] Cấu hình:
  - Max file size (ví dụ: 10MB)
  - Allowed file types (images, pdf, etc.)
  - Upload directory path
- [ ] API endpoint: POST `/api/upload`
  - Validate API key qua middleware
  - Validate file type và size
  - Generate unique filename (UUID + extension)
  - Lưu file vào disk 
  - Lưu metadata vào database
  - Return file info (id, url, size, etc.)

## Phase 6: File Management
- [ ] API endpoint: GET `/api/files` - list files của user (pagination)
- [ ] API endpoint: GET `/api/files/:id` - lấy thông tin 1 file
- [ ] API endpoint: DELETE `/api/files/:id` - xóa file
- [ ] API endpoint: GET `/api/download/:id` - download file
- [ ] Static file serving cho uploaded files

## Phase 7: Validation & Error Handling
- [ ] Validate file extensions (whitelist: jpg, png, pdf, etc.)
- [ ] Validate file size trước khi upload
- [ ] Validate MIME type
- [ ] Error responses chuẩn (JSON format)
- [ ] Logging cho các operations

## Phase 8: Security Enhancements
- [ ] Rate limiting (giới hạn số request/API key)
- [ ] File sanitization (rename, remove malicious content)
- [ ] CORS configuration
- [ ] Hash API keys trong database (optional)
- [ ] HTTPS configuration

## Phase 9: Testing
- [ ] Unit tests cho business logic
- [ ] Integration tests cho API endpoints
- [ ] Test upload với different file types
- [ ] Test authentication middleware
- [ ] Load testing (optional)

## Phase 10: Documentation & Deployment
- [ ] Viết API documentation (Swagger/Postman collection)
- [ ] Tạo README với hướng dẫn setup
- [ ] Environment variables documentation
- [ ] Docker configuration (Dockerfile, docker-compose)
- [ ] Deploy lên server (VPS/Cloud)

## Bonus Features (Optional)
- [ ] Multiple file upload
- [ ] Image thumbnail generation
- [ ] File compression
- [ ] Cloud storage integration (AWS S3, Google Cloud Storage)
- [ ] File sharing với public URLs
- [ ] Usage analytics (storage used, bandwidth)
- [ ] WebSocket cho upload progress
- [ ] Admin dashboard