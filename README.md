# File Upload Service

A RESTful API service built with Go for secure file uploads with API key authentication.

## Features

- API Key based authentication
- Secure file upload with validation
- File management (list, download, delete)
- PostgreSQL database
- File type and size validation
- RESTful API design

## Project Structure

```
.
├── cmd/
│   └── main.go                 # Application entry point
├── internal/
│   ├── config/                 # Configuration management
│   ├── handler/                # HTTP handlers
│   ├── middleware/             # Authentication middleware
│   ├── model/                  # Data models
│   ├── repository/             # Database operations
│   └── service/                # Business logic
├── uploads/                    # File storage directory
├── .env                        # Environment variables
├── .gitignore
└── go.mod
```

## Prerequisites

- Go 1.21 or higher
- PostgreSQL database

## Installation

### Option 1: Manual Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   go mod download
   ```

3. Configure environment variables in `.env`:
   ```
   DB_DRIVER=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=storage_db
   DB_USERNAME=postgres
   DB_PASSWORD=yourpassword

   SERVER_PORT=8080
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760  # 10MB in bytes
   STORAGE_URL=http://localhost:8080  # Public URL for file access
   ```

4. Setup the database:

   **Important:** If you encounter permission errors, you need to run the setup SQL script first:
   ```bash
   # Make sure psql is installed
   chmod +x setup.sh
   ./setup.sh
   ```

   Or run manually:
   ```bash
   PGPASSWORD=your_password psql -h host -p port -U username -d database -f setup.sql
   ```

5. Build and run:
   ```bash
   go build -o storage-service cmd/main.go
   ./storage-service
   ```

### Option 2: Docker Setup

1. Using Docker Compose (recommended):
   ```bash
   docker-compose up -d
   ```

   This will start both the application and PostgreSQL database.

2. Build and run manually:
   ```bash
   docker build -t storage-service .
   docker run -p 8080:8080 --env-file .env storage-service
   ```

## Running the Service

The server will start on `http://localhost:8080`

## API Endpoints

### Public Endpoints

#### Health Check
```
GET /health
```

### User Management

**Note:** The user registration endpoint is disabled for security. Users must be created manually through the database.

#### Create User Manually

Use the provided SQL script:
```bash
# Edit create_user.sql with your user details
PGPASSWORD=your_password psql -h host -p port -U username -d database -f create_user.sql
```

Or insert directly:
```sql
INSERT INTO users (username, email, api_key, created_at, updated_at)
VALUES ('username', 'email@example.com', gen_random_uuid()::text, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

The API key will be generated automatically. Save it for API access.

### Protected Endpoints (Require X-API-Key header)

#### Get Current User Info
```
GET /api/users/me
X-API-Key: your-api-key
```

#### Regenerate API Key
```
POST /api/users/regenerate-key
X-API-Key: your-api-key
```

#### Upload File (General)
```
POST /api/upload
X-API-Key: your-api-key
Content-Type: multipart/form-data

file: [binary file data]
```

Accepts: Images (.jpg, .jpeg, .png, .gif), Documents (.pdf, .doc, .docx, .txt), Archives (.zip)

#### Upload Image (Optimized)
```
POST /api/upload-image
X-API-Key: your-api-key
Content-Type: multipart/form-data

image: [image file data]
```

**Features:**
- Only accepts images (JPEG, PNG, GIF)
- Automatic image optimization
- Resizes large images (max 2048x2048) while maintaining aspect ratio
- JPEG quality optimization (85%)
- GIF images converted to JPEG for smaller file size
- Content-type validation for security

Response:
```json
{
  "message": "Image uploaded and optimized successfully",
  "file": {
    "id": 1,
    "user_id": 1,
    "filename": "unique-uuid.jpg",
    "original_name": "photo.jpg",
    "file_path": "./uploads/1/2025-11-26/unique-uuid.jpg",
    "file_size": 123456,
    "mime_type": "image/jpeg",
    "url": "https://storage.smarttraffic.today/uploads/1/2025-11-26/unique-uuid.jpg",
    "created_at": "2025-11-26T00:00:00Z"
  }
}
```

**Note:** Files are organized by user ID and date: `uploads/{user_id}/{YYYY-MM-DD}/filename`

#### List Files
```
GET /api/files?page=1&page_size=10
X-API-Key: your-api-key
```

#### Get File Info
```
GET /api/files/:id
X-API-Key: your-api-key
```

#### Get Image Info (with dimensions)
```
GET /api/images/:id
X-API-Key: your-api-key
```

Returns file information plus image dimensions:
```json
{
  "file": {
    "id": 1,
    "url": "https://storage.smarttraffic.today/uploads/1/2025-11-26/uuid.jpg",
    ...
  },
  "info": {
    "width": 1920,
    "height": 1080
  }
}
```

#### Download File
```
GET /api/download/:id
X-API-Key: your-api-key
```

#### Delete File
```
DELETE /api/files/:id
X-API-Key: your-api-key
```

## File Organization

Files are automatically organized in a hierarchical structure:

```
uploads/
├── {user_id}/
│   ├── {YYYY-MM-DD}/
│   │   ├── {uuid}.jpg
│   │   ├── {uuid}.pdf
│   │   └── ...
│   └── {YYYY-MM-DD}/
│       └── ...
└── {user_id}/
    └── ...
```

Example: `uploads/1/2025-11-26/550e8400-e29b-41d4-a716-446655440000.jpg`

Benefits:
- **User Isolation**: Each user has their own folder
- **Date Organization**: Files grouped by upload date
- **Easy Management**: Simple to backup, archive, or clean up old files
- **Scalability**: Prevents single directory from having too many files

## Image Optimization

The `/api/upload-image` endpoint provides automatic image optimization:

### Features
- **Smart Resizing**: Automatically resizes images larger than 2048x2048 pixels while maintaining aspect ratio
- **Quality Optimization**: JPEG images compressed at 85% quality for optimal balance between size and quality
- **Format Handling**:
  - JPEG/JPG: Optimized with quality compression
  - PNG: Preserved for images with transparency
  - GIF: Converted to JPEG for smaller file size (animation lost)
- **Content Validation**: Verifies actual file content (not just extension) for security
- **Automatic Processing**: No configuration needed, all images optimized automatically

### When to Use
- **Use `/api/upload-image`** for:
  - User profile pictures
  - Product images
  - Photo galleries
  - Any image that needs to be displayed on web/mobile
  - Images from cameras or high-resolution sources

- **Use `/api/upload`** for:
  - Images that must retain original quality
  - Documents (PDF, DOC, etc.)
  - Archives (ZIP)
  - Any non-image files

### Example Results
```
Original:  5.2 MB (4000x3000 JPEG)
Optimized: 450 KB (2048x1536 JPEG 85%)
Savings:   91% reduction
```

## Allowed File Types

### General Upload (`/api/upload`)
- Images: .jpg, .jpeg, .png, .gif
- Documents: .pdf, .doc, .docx, .txt
- Archives: .zip

### Image Upload (`/api/upload-image`)
- Images only: JPEG, PNG, GIF

## Security Features

- API Key authentication
- File type validation (whitelist)
- Content-type validation (verifies actual file content, not just extension)
- File size limits
- CORS configuration
- Unique filename generation (UUID)
- User-specific file access control
- Private user folders with date-based organization
- Image content verification for upload-image endpoint

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Development

### Build
```bash
go build -o storage-service cmd/main.go
```

### Run
```bash
./storage-service
```

## Testing with cURL

### Register a user
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com"}'
```

### Upload a file
```bash
curl -X POST http://localhost:8080/api/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@/path/to/file.jpg"
```

### List files
```bash
curl -X GET "http://localhost:8080/api/files?page=1&page_size=10" \
  -H "X-API-Key: your-api-key"
```

### Download file
```bash
curl -X GET http://localhost:8080/api/download/1 \
  -H "X-API-Key: your-api-key" \
  -O -J
```

### Delete file
```bash
curl -X DELETE http://localhost:8080/api/files/1 \
  -H "X-API-Key: your-api-key"
```

## Postman Collection

A Postman collection (`postman_collection.json`) is included in the repository for easy API testing. Import it into Postman to quickly test all endpoints.

The collection includes:
- Environment variables for base URL and API key
- All API endpoints with sample requests
- Automatic API key extraction from register/regenerate responses

## Files Included

- `cmd/main.go` - Application entry point
- `internal/` - Application code (handlers, services, repositories, models)
- `setup.sql` - Database setup script
- `setup.sh` - Shell script to run database setup
- `Dockerfile` - Docker image configuration
- `docker-compose.yml` - Docker Compose configuration
- `postman_collection.json` - Postman API collection
- `.gitignore` - Git ignore rules
- `README.md` - This file

## License

MIT
