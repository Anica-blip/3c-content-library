# 🎯 3C Public Library - Enhanced Edition

**A modern, production-ready content management system with intelligent database architecture, enhanced PDF viewing, and automated workflows.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green.svg)](https://supabase.com)
[![Cloudflare](https://img.shields.io/badge/Storage-Cloudflare%20R2-orange.svg)](https://www.cloudflare.com/products/r2/)

**Live Demo:** [3c-public-library.org](https://3c-public-library.org)

---

## ✨ What Makes This Special

This isn't just another content library - it's a **complete ecosystem** for managing and sharing digital content with enterprise-grade features:

- 🗄️ **Smart Two-Table Architecture** - Public content for everyone, private content for courses
- 🔗 **Intelligent PDF Viewer** - Detects clickable links and opens them in draggable modals
- 🤖 **Automated Screenshots** - GitHub Actions generates thumbnails for external URLs daily
- 📊 **Real-Time Analytics** - Track views, last page viewed, user interactions
- 🎨 **Modern UI/UX** - Dark mode, grid/list views, lazy loading, playback memory
- 🚀 **Production-Ready** - Cloudflare R2 storage, Supabase database, automated deployment

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

---

## 📋 Quick Start for Deployment

### New Deployment?
Follow these guides in order:

1. **[Deployment Overview](DEPLOYMENT.md)** - Start here!
2. **[Supabase Setup](SUPABASE-SETUP.md)** - Database configuration
3. **[Cloudflare R2 Setup](CLOUDFLARE-R2-SETUP.md)** - File storage setup
4. **[GitHub Setup](GITHUB-SETUP.md)** - Version control & deployment

### Already Deployed?
1. **Open Admin Dashboard:** `https://3c-public-library.org/admin.html`

2. **Configure Supabase** (if not done)
   - Enter your Supabase URL and key
   - Click "Save & Enable Auto-Sync"
   - Test connection

3. **Create a Folder**
- Enter folder name
- Add optional description
- Click "Create Folder"

4. **Add Content**
   - Files automatically upload to Cloudflare R2
   - Metadata syncs to Supabase
   - No file size limits!
   
   **Steps:**
   1. Select folder
   2. Enter title
   3. Choose content type
   4. Upload file (goes to R2) or paste URL
   5. Upload thumbnail (optional)
   6. Add description
   7. Click "Add Content"

5. **Share with Public**
   - Copy folder URL: `https://3c-public-library.org/library.html?folder=YOUR-FOLDER`
   - Share with users
   - They see beautiful grid with thumbnails
   - Clicking PDFs opens interactive viewer

## File Storage

### Production: Cloudflare R2 (Recommended)
- ✅ **Unlimited file sizes** - No browser limits!
- ✅ **Zero bandwidth costs** - Serve files globally for free
- ✅ **$0.015/GB storage** - Very affordable
- ✅ **Global CDN** - Fast delivery worldwide
- ✅ **Professional URLs** - `files.3c-public-library.org`
- ✅ **Automatic backups** - Files stored securely

**Setup:** See [CLOUDFLARE-R2-SETUP.md](CLOUDFLARE-R2-SETUP.md)

### Fallback: LocalStorage (Development/Testing)
- Files stored as base64 in browser
- **Limit: ~5-10MB per file** (browser dependent)
- Perfect for: Testing, thumbnails
- Works offline

### Alternative: External URLs
- YouTube for videos
- Google Drive for documents
- Any public URL

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

### Production (Any Size Library)
- ✅ **Use Cloudflare R2** for all files
- ✅ No size limits or concerns
- ✅ Costs ~$0.08-$8/month depending on size
- ✅ Professional infrastructure
- ✅ Automatic sync with Supabase

### Development/Testing
- Use localStorage for quick testing
- Switch to R2 before going live
- Keep test files small (< 5MB)

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
- **Files:** Cloudflare R2 (production) or localStorage (development)
- **Metadata:** Supabase database (auto-synced)
- **Thumbnails:** R2 or base64 fallback
- **Backups:** Automatic via Supabase + manual export

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

## Project Files

### Core Application
- `admin.html` - Admin dashboard with R2 uploads and Supabase sync
- `library.html` - Public library with dark mode and interactive PDF viewer
- `index.html` - Landing page
- `config.js` - Configuration (update with your credentials)
- `r2-storage.js` - Cloudflare R2 integration module

### Backend/Worker
- `worker-api.js` - Cloudflare Worker for R2 file uploads

### Configuration
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

### Documentation (Production)
- `README.md` - This file
- `DEPLOYMENT.md` - Deployment overview
- `SUPABASE-SETUP.md` - Supabase configuration guide
- `CLOUDFLARE-R2-SETUP.md` - R2 storage setup guide
- `GITHUB-SETUP.md` - GitHub & deployment guide

### Legacy Files (Can be removed)
- `BACKUP-RECOVERY.md` - Old backup guide (replaced by Supabase)
- `COMPLETE-SETUP-SUMMARY.md` - Old setup guide
- `FINAL-SETUP.md` - Old setup guide
- `URL-SHARING-GUIDE.md` - Old sharing guide (info now in README)
- `PDF-INTERACTIVE-MEDIA.md` - Old media guide (info now in README)
- `debug.html` - Debug tool (optional, can keep for troubleshooting)
- `start-server.sh` - Local server script (optional, for development)
