# 3C Content Library

Enhanced content library with file uploads, thumbnail previews, and interactive PDF viewer.

## New Features

### Admin Dashboard (`admin.html`)
✅ **File Upload Support**
- Drag & drop files directly into the dashboard
- Upload PDFs, videos, images, audio files
- Files stored as base64 in localStorage (works offline)
- File size displayed during upload

✅ **Thumbnail/Preview Images**
- Upload custom thumbnail for any content
- Thumbnails shown in admin panel and public library
- Automatic fallback to type icons if no thumbnail

✅ **Flexible Content Sources**
- Upload files directly OR use external URLs
- Mix uploaded and linked content in same library
- Perfect for combining local files with YouTube/Drive links

### Public Library (`library.html`)
✅ **Grid View with Thumbnails**
- Beautiful card-based grid layout
- Custom thumbnails or type icons
- Hover effects and visual feedback

✅ **Interactive PDF Viewer**
- Click PDF thumbnail to open popup viewer
- Powered by PDF.js (no Adobe required!)
- Features:
  - Page navigation (Previous/Next)
  - Zoom in/out controls
  - Displays all pages in scrollable view
  - Keyboard shortcuts (ESC to close)
  - Smooth scrolling between pages

✅ **Enhanced Media Support**
- PDFs: Interactive popup viewer
- Videos: Embedded or uploaded
- Images: Full-size display
- Audio: Built-in player

## Quick Start

### 1. Open Admin Dashboard
Open `admin-enhanced.html` in your browser

### 2. Create a Folder
- Enter folder name
- Add optional description
- Click "Create Folder"

### 3. Add Content (Two Ways)

**Option A: Upload Files**
1. Select folder
2. Enter title
3. Choose content type
4. Drag & drop file or click "Choose File"
5. (Optional) Upload thumbnail image
6. Add description
7. Click "Add Content"

**Option B: Use External URLs**
1. Select folder
2. Enter title
3. Choose content type
4. Paste external URL (YouTube, Google Drive, etc.)
5. (Optional) Upload thumbnail image
6. Add description
7. Click "Add Content"

### 4. Share with Public
- Copy the folder URL from admin panel
- Share with users
- They'll see a beautiful grid of content with thumbnails
- Clicking PDFs opens interactive viewer

## File Storage

### LocalStorage (Built-in)
- Files stored as base64 in browser
- **Limit: ~5-10MB per file** (browser dependent)
- Perfect for: Documents, small PDFs, images
- No server needed - works offline!

### For Larger Files
Use external hosting + URLs:

**Best Options:**
1. **Cloudflare R2** - $0.015/GB, no bandwidth fees
2. **Backblaze B2** - $0.005/GB storage
3. **Bunny CDN** - $0.01/GB storage + bandwidth
4. **Google Drive** - 15GB free
5. **YouTube** - Unlimited free video hosting

## PDF Viewer Features

The interactive PDF viewer includes:
- **Full PDF rendering** - All pages displayed
- **Navigation** - Previous/Next buttons
- **Zoom controls** - Zoom in/out for better reading
- **Page counter** - Shows current page and total
- **Keyboard support** - ESC to close
- **Smooth scrolling** - Navigate between pages easily
- **No plugins needed** - Pure JavaScript with PDF.js

## Storage Recommendations

### Small Library (< 50MB total)
- Use built-in localStorage
- Upload files directly in admin
- No external hosting needed

### Medium Library (50MB - 500MB)
- Mix of uploaded small files + external URLs
- Host large PDFs on Google Drive
- Upload thumbnails and small images

### Large Library (> 500MB)
- Use external hosting for all files
- Upload only thumbnails in admin
- Link to files on Cloudflare R2 or Backblaze

## Technical Details

### File Format Support
- **PDFs**: Interactive viewer with PDF.js
- **Videos**: MP4, WebM, OGG
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Audio**: MP3, WAV, OGG

### Browser Compatibility
- Chrome/Edge ✅
- Firefox ✅
- Safari ✅
- Opera ✅

### Data Storage
- All data in browser localStorage
- Export/import as JSON for backup
- Thumbnails stored as base64
- Uploaded files stored as base64

## Tips & Best Practices

### For Best Performance:
1. **Thumbnails**: Keep under 200KB each
2. **PDFs**: Under 5MB for upload, larger use external URLs
3. **Videos**: Always use external hosting (YouTube, Vimeo)
4. **Images**: Compress before upload

### For Best User Experience:
1. Always add thumbnails for PDFs
2. Use descriptive titles
3. Add descriptions to help users
4. Organize content into logical folders
5. Test PDF viewer on different devices

### Security:
1. Host `admin-enhanced.html` in protected directory
2. Use `.htaccess` or password protection
3. Only share `library.html` URLs publicly
4. Regular backups via export function

## Upgrading from Basic Version

If you're using the basic version (`admin.html` / `library.html`):

1. Your data is compatible!
2. Open `admin-enhanced.html`
3. Your folders and content will load automatically
4. New uploads will add thumbnail support
5. Old content works as before

## Example Workflow

### Scenario: Training Materials Library

1. **Create Folders**
   - "Onboarding Documents"
   - "Video Tutorials"
   - "Reference Guides"

2. **Add Content**
   - Upload small PDFs (< 5MB) directly
   - Link to YouTube training videos
   - Upload thumbnail screenshots for each
   - Add descriptions

3. **Share**
   - Copy folder URLs
   - Send to team members
   - They browse beautiful grid view
   - Click PDFs to read in interactive viewer

## Troubleshooting

### "File too large" error
- Use external URL instead of upload
- Or compress the file before uploading

### PDF not rendering
- Check if file is valid PDF
- Try re-uploading
- Use external URL as fallback

### Thumbnails not showing
- Check image file size (keep under 500KB)
- Use JPG or PNG format
- Try re-uploading

## Support

For hosting setup help, see the main README.md file for detailed hosting provider instructions.

## Files

- `admin.html` - Admin dashboard with file uploads, edit, and reordering
- `library.html` - Public library with dark mode and purple folder styling
- `index.html` - Landing page
- `debug.html` - Debug tool (password protected)
- `start-server.sh` - Quick server startup script
- Documentation:
  - `README.md` - Main documentation
  - `URL-SHARING-GUIDE.md` - Guide for sharing folder-specific URLs
  - `PDF-INTERACTIVE-MEDIA.md` - Info about PDF media support
