# Image Optimization Feature

## Overview

The storage service now includes an optimized image upload endpoint that automatically processes and optimizes images for web and mobile applications.

## Endpoint

```
POST /api/upload-image
X-API-Key: your-api-key
Content-Type: multipart/form-data

image: [image file]
```

## Features

### 1. Automatic Resizing
- **Max dimensions**: 2048x2048 pixels
- **Aspect ratio preserved**: Images are resized proportionally
- **Smart detection**: Only resizes if image exceeds max dimensions
- **Algorithm**: Uses Lanczos resampling for high-quality results

### 2. Quality Optimization
- **JPEG compression**: 85% quality (optimal balance)
- **PNG handling**: Preserved for transparency support
- **GIF conversion**: Converted to JPEG for smaller file size

### 3. Content Validation
- **Real content check**: Validates actual file content, not just extension
- **Security**: Prevents malicious files with fake extensions
- **Magic number detection**: Uses file headers for accurate type detection

### 4. Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)

## Usage Examples

### cURL
```bash
curl -X POST https://storage.smarttraffic.today/api/upload-image \
  -H "X-API-Key: your-api-key" \
  -F "image=@photo.jpg"
```

### JavaScript (with Fetch)
```javascript
const formData = new FormData();
formData.append('image', imageFile);

const response = await fetch('https://storage.smarttraffic.today/api/upload-image', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-api-key'
  },
  body: formData
});

const result = await response.json();
console.log(result.file.url); // Full URL to optimized image
```

### Python (with requests)
```python
import requests

url = 'https://storage.smarttraffic.today/api/upload-image'
headers = {'X-API-Key': 'your-api-key'}
files = {'image': open('photo.jpg', 'rb')}

response = requests.post(url, headers=headers, files=files)
data = response.json()
print(data['file']['url'])
```

## Response Format

```json
{
  "message": "Image uploaded and optimized successfully",
  "file": {
    "id": 123,
    "user_id": 1,
    "filename": "550e8400-e29b-41d4-a716-446655440000.jpg",
    "original_name": "vacation-photo.jpg",
    "file_path": "./uploads/1/2025-11-26/550e8400-e29b-41d4-a716-446655440000.jpg",
    "file_size": 425678,
    "mime_type": "image/jpeg",
    "url": "https://storage.smarttraffic.today/uploads/1/2025-11-26/550e8400-e29b-41d4-a716-446655440000.jpg",
    "created_at": "2025-11-26T14:00:00Z"
  }
}
```

## Get Image Info with Dimensions

```
GET /api/images/:id
X-API-Key: your-api-key
```

Response:
```json
{
  "file": {
    "id": 123,
    "url": "https://storage.smarttraffic.today/uploads/1/2025-11-26/uuid.jpg",
    ...
  },
  "info": {
    "width": 2048,
    "height": 1536
  }
}
```

## Optimization Results

### Example 1: High-Resolution Photo
```
Before:  5.2 MB (4000x3000 pixels, JPEG)
After:   450 KB (2048x1536 pixels, JPEG 85%)
Savings: 91.3% reduction
```

### Example 2: Already Optimized
```
Before:  800 KB (1920x1080 pixels, JPEG)
After:   720 KB (1920x1080 pixels, JPEG 85%)
Savings: 10% reduction (re-compression only)
```

### Example 3: Large PNG with Transparency
```
Before:  3.5 MB (3000x2000 pixels, PNG)
After:   2.1 MB (2048x1365 pixels, PNG)
Savings: 40% reduction (maintains transparency)
```

### Example 4: Animated GIF
```
Before:  8.2 MB (800x600 pixels, GIF animated)
After:   180 KB (800x600 pixels, JPEG 85%)
Savings: 97.8% reduction (animation removed)
```

## When to Use

### ✅ Use `/api/upload-image` for:
- User profile pictures
- Product images for e-commerce
- Photo galleries
- Blog post images
- Social media images
- Any image displayed on web or mobile
- Images from cameras or phones (usually high-res)
- Images that need to load quickly

### ❌ Use `/api/upload` instead for:
- Images requiring original quality (professional photography)
- Medical or scientific images
- Images for print production
- Documents (PDF, DOC, etc.)
- Archives (ZIP)
- Images with specific size requirements
- Screenshots with small text

## Technical Details

### Image Processing Pipeline
1. **Validation**: Check file size and verify content type
2. **Decode**: Parse image data into memory
3. **Resize**: If needed, resize to max 2048x2048 maintaining aspect ratio
4. **Optimize**: Apply format-specific compression
5. **Encode**: Save optimized image
6. **Store**: Write to user/date folder structure
7. **Generate URL**: Create full public URL
8. **Save metadata**: Store file info in database

### Resampling Algorithm
- **Method**: Lanczos3 filter
- **Quality**: High (better than bicubic)
- **Performance**: Fast enough for real-time processing
- **Use case**: Ideal for downscaling photos

### Quality Settings
- **JPEG Quality**: 85/100
  - Excellent visual quality
  - Good compression ratio
  - Industry-standard for web images
- **PNG**: Lossless compression
  - Maintains transparency
  - Larger than JPEG but necessary for alpha channel

### Memory Management
- Images processed in memory for speed
- Suitable for images up to max file size limit (10MB default)
- Automatic cleanup on errors

## Error Handling

### Common Errors

**Invalid file type**
```json
{
  "error": "file type not allowed, only images (JPEG, PNG, GIF) are accepted"
}
```

**File too large**
```json
{
  "error": "file size exceeds maximum allowed size of 10485760 bytes"
}
```

**Not an image**
```json
{
  "error": "unable to determine file type"
}
```

**Corrupted image**
```json
{
  "error": "failed to decode image"
}
```

## Configuration

Image optimization settings are defined in the ImageService:

```go
maxWidth:    2048  // Max width in pixels
maxHeight:   2048  // Max height in pixels
jpegQuality: 85    // JPEG quality (0-100)
```

To modify these values, edit `internal/service/image_service.go` in the `NewImageService` function.

## Performance

### Upload Times (approximate)
- Small image (< 1MB): ~200-500ms
- Medium image (1-3MB): ~500ms-1s
- Large image (3-10MB): ~1-2s

Times include:
- Upload
- Processing/optimization
- Storage
- Database save

### Storage Savings
- Typical savings: 80-95% for high-res photos
- Minimal savings: 5-15% for already optimized images
- Maximum savings: Up to 98% for large animated GIFs

## Best Practices

1. **Always use for user uploads**: End users typically upload high-res photos
2. **Use for product images**: Optimize before storing in your system
3. **Profile pictures**: Essential for fast page loads
4. **Gallery images**: Dramatically reduces storage and bandwidth costs
5. **Mobile uploads**: Photos from phones are typically 3-8MB, can be reduced to 200-500KB

## Security Considerations

- ✅ Content-type validation (not just extension)
- ✅ File size limits enforced
- ✅ Image decoding validates structure
- ✅ User-specific folders prevent access issues
- ✅ No executable code can survive image processing
- ✅ Original filenames sanitized (UUID-based)

## Dependencies

- `github.com/disintegration/imaging` - Image processing library
- `github.com/h2non/filetype` - File type detection

Both are well-maintained, production-ready libraries used in many Go applications.

## Comparison: `/api/upload` vs `/api/upload-image`

| Feature | `/api/upload` | `/api/upload-image` |
|---------|---------------|---------------------|
| **File Types** | Images, docs, archives | Images only |
| **Optimization** | None | Automatic |
| **Resizing** | No | Yes (max 2048x2048) |
| **Quality Control** | Original | JPEG 85%, PNG lossless |
| **Content Validation** | Extension only | Full content check |
| **Use Case** | General files | Web/mobile images |
| **Performance** | Faster | Slightly slower |
| **Storage** | Original size | Optimized size |

## Future Enhancements (Possible)

- [ ] Thumbnail generation (multiple sizes)
- [ ] WebP format support
- [ ] AVIF format support
- [ ] Configurable quality per request
- [ ] Image filters (grayscale, blur, etc.)
- [ ] Watermarking support
- [ ] Face detection for smart cropping
- [ ] EXIF data preservation options
- [ ] Batch image upload
- [ ] Progress tracking for large uploads
