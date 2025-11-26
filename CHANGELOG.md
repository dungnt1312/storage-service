# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-11-26

### Added

#### Image Upload with Automatic Optimization
- **New endpoint**: `POST /api/upload-image` for optimized image uploads
- **Automatic resizing**: Images larger than 2048x2048 automatically resized maintaining aspect ratio
- **Quality optimization**: JPEG compression at 85% quality
- **Format handling**:
  - JPEG/JPG optimized with quality compression
  - PNG preserved for transparency
  - GIF converted to JPEG for smaller file size
- **Content validation**: Verifies actual file content (not just extension) for security
- **Image info endpoint**: `GET /api/images/:id` returns image with dimensions

#### New Dependencies
- `github.com/disintegration/imaging` - Image processing library
- `github.com/h2non/filetype` - File type detection

#### New Files
- `internal/service/image_service.go` - Image optimization service
- `internal/handler/image_handler.go` - Image upload handler

### Benefits
- Significant storage savings (typically 80-95% reduction for high-res images)
- Faster image loading on web/mobile applications
- Automatic processing - no configuration needed
- Maintains visual quality while reducing file size

### Technical Details

#### Image Processing
- Max dimensions: 2048x2048 pixels
- JPEG quality: 85%
- Aspect ratio maintained during resize
- Uses Lanczos resampling for high-quality downscaling

---

## [1.1.0] - 2025-11-26

### Changed

#### File Organization
- **User-specific folders**: Files now organized in private folders per user
- **Date-based structure**: Files grouped by upload date (YYYY-MM-DD)
- **New path format**: `uploads/{user_id}/{YYYY-MM-DD}/{uuid}.ext`
- **Benefits**: Better organization, scalability, and easier file management

#### API Response Enhancement
- **Full URLs returned**: All file responses now include complete URLs
- **URL field added**: New `url` field in file model with full public URL
- **Storage URL configuration**: Added `STORAGE_URL` environment variable
- **Example**: `https://storage.smarttraffic.today/uploads/1/2025-11-26/file.jpg`

#### Security Enhancement
- **Registration disabled**: User registration endpoint removed for security
- **Manual user creation**: Users must be created through database
- **SQL script provided**: `create_user.sql` for easy user creation
- **Admin control**: Better control over user accounts

### Added
- `STORAGE_URL` configuration in `.env`
- `create_user.sql` script for manual user creation
- URL generation logic in file service
- Date-based folder structure creation
- User folder isolation

### Modified Files
- `internal/config/config.go`: Added StorageURL field
- `internal/model/file.go`: Added URL field (not persisted in DB)
- `internal/service/file_service.go`:
  - Updated to create user/date folders
  - Added URL generation for files
  - Added storageURL parameter to constructor
- `internal/handler/user_handler.go`: Commented out register route
- `cmd/main.go`: Pass storage URL to file service
- `README.md`: Updated with new features and file organization
- `QUICKSTART.md`: Updated user creation instructions
- `.env`: Added STORAGE_URL configuration

### Technical Details

#### File Storage Structure
```
Before: uploads/{uuid}.ext
After:  uploads/{user_id}/{YYYY-MM-DD}/{uuid}.ext
```

#### API Response Changes
```json
// Before
{
  "file_path": "./uploads/uuid.jpg"
}

// After
{
  "file_path": "./uploads/1/2025-11-26/uuid.jpg",
  "url": "https://storage.smarttraffic.today/uploads/1/2025-11-26/uuid.jpg"
}
```

### Migration Notes

For existing installations:
1. Update `.env` file to include `STORAGE_URL`
2. Rebuild application: `go build -o storage-service cmd/main.go`
3. Existing files will continue to work
4. New uploads will use the new folder structure
5. User registration endpoint is now disabled

### Breaking Changes
- ❌ `POST /api/users/register` endpoint removed
- ✅ Create users via `create_user.sql` script instead

---

## [1.0.0] - 2025-11-26

### Added
- Initial release
- API key authentication
- File upload functionality
- File management (list, download, delete)
- PostgreSQL database integration
- File type and size validation
- CORS support
- User management endpoints
- Docker support
- Comprehensive documentation

### Features
- User registration with automatic API key generation
- Secure file upload with validation
- File listing with pagination
- File download
- File deletion
- Health check endpoint
- API key regeneration

### Security
- API key based authentication
- File type whitelist validation
- File size limits
- User-specific file access control
- CORS configuration

### Documentation
- README.md with complete API documentation
- QUICKSTART.md for quick setup
- Docker support with docker-compose
- Postman collection for API testing
