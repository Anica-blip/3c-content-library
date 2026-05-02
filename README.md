# 3C Content Library

The 3C Thread To Success brand, including its name, structure, characters (Aurion 3C Mascot), and overall system design, remains the intellectual property of the creator and is not included in this license.

Commercial use of the brand or replication of the ecosystem identity is not permitted without permission.

## 🎭 The 3C Ecosystem

This project is part of a larger system built around three core identities:

Aurion → Engagement & Experience
Caelum → Structure & Direction
Anica (Founder) → Authority & Vision

Together, they create a balanced environment for growth, learning, and progression.

**A modern, production-ready content management system with interactive flipbook and presentation viewer, intelligent database architecture, and automated workflows.**

---

## 🚀 Overview

The 3C Content Library is a comprehensive digital content management platform designed for educators, content creators, and organizations. It features an advanced interactive flipbook and presentation viewer with support for videos, buttons, hotspots, GIFs, and more - all working seamlessly across documents of any size.

### 📖 Quick Links:
- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[FLIPBOOK-SYSTEM.md](FLIPBOOK-SYSTEM.md)** - Flipbook viewer documentation
- **[PRESENTATION-SYSTEM.md](PRESENTATION-SYSTEM.md)** - Presentation viewer documentation
- **[Cloudflare Setup](CLOUDFLARE-GITHUB-SETUP.md)** - Worker deployment guide

### ✨ Key Features:
1. **Interactive Flipbook and Presentation Viewer** - Advanced PDF viewer with interactive elements
2. **Event Delegation** - Interactive elements work on ALL pages (tested up to 32+ pages)
3. **Multi-Media Support** - Videos, GIFs, audio, buttons, hotspots, links
4. **Mobile Responsive** - Touch-enabled interface for mobile devices
5. **Private Folder System** - Password-protected content with owner bypass

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green.svg)](https://supabase.com)
[![Cloudflare](https://img.shields.io/badge/Storage-Cloudflare%20R2-orange.svg)](https://www.cloudflare.com/products/r2/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success.svg)]()

**Live Demo:** [3c-public-library.org](https://3c-public-library.org)

---

## ✨ What Makes This Special

### 🎬 **Interactive Flipbook and Presentation Viewer**
- **Event Delegation System** - Interactive elements work on ALL pages, regardless of document size
- **Multi-Media Elements** - Videos (9:16 & 16:9), GIFs, audio, buttons, hotspots, links
- **Smart Video Display** - Automatic aspect ratio detection with object-fit: contain
- **No Popup Errors** - Clean error handling via console (F12) for debugging
- **Brand Colors** - Dark purple theme matching 3C brand identity

### 🏗️ **Intelligent Architecture**
- **Two-Table Design** - Separate public and private content tables for scalability
- **Smart Routing** - Content automatically goes to the right table based on visibility
- **Owner Bypass** - Admin email configured for password-free access to private folders
- **Event Delegation** - Persistent event handlers survive Turn.js DOM manipulation

### 🎨 **Enhanced User Experience**
- **Intelligent PDF Viewer** - Detects clickable links in PDFs and opens them in draggable modals
- **Dark Mode** - Beautiful dark theme with smooth transitions
- **Grid/List Views** - Switch between layouts on the fly
- **Lazy Loading** - Only load content when needed for better performance
- **Playback Memory** - Remembers last PDF page viewed

### 🤖 **Automation & Analytics**
- **Auto-Screenshot Generation** - GitHub Actions creates thumbnails for external URLs daily
- **View Tracking** - Real-time analytics on content views
- **Last Page Memory** - Tracks where users left off in PDFs
- **User Interaction Logging** - Comprehensive analytics

### 🚀 **Production Infrastructure**
- **Cloudflare R2** - Unlimited file storage with zero bandwidth costs
- **Supabase** - Real-time PostgreSQL database with auto-sync
- **GitHub Actions** - Automated workflows and deployments
- **Custom Domain** - Professional branded experience
- **Global CDN** - Fast delivery worldwide

---

## 🎯 Key Features

### 📁 **Smart Folder Management**
- **Title-Based Display** - Folder title is the main display name (not description)
- **Auto-Generated URLs** - Clean, SEO-friendly slugs with auto-increment
- **Table Name Organization** - Simple technical names for database grouping
- **Public/Private Split** - Separate tables for public library vs. paid courses
- **Item Count Tracking** - Automatic count updates

**Example:**
```
Title: "Anica Coffee Break Chat"
Table Name: "anica_chats"
Visibility: Public
→ Slug: anica-coffee-break-chat-01
→ Content goes to: content_public.anica_chats
```

### 📄 **Individual Content Records**
- **No JSON Stacks** - Each content item is a separate database record
- **Form Auto-Reset** - Save button automatically resets form for next entry
- **Edit Mode** - Update existing records without creating duplicates
- **Dual URL Support** - File URL + Tech/Reference URL for each item
- **Content Reordering** - Move items up/down with simple buttons

### 🔗 **Enhanced PDF Viewer**
- **Link Detection** - Automatically detects clickable links in PDFs
- **Modal Popups** - Links open in draggable/resizable modals (not new tabs)
- **Keyboard Shortcuts** - Arrow keys for navigation, +/- for zoom, ESC to close
- **Touch Gestures** - Swipe support for mobile devices
- **Page Memory** - Remembers last page viewed per PDF
- **Zoom Controls** - Smooth zoom in/out functionality

### 🐛 **Debug Panel**
- **Toggle Button** - Click 🐛 in top-right corner
- **Real-Time Logs** - See all operations as they happen
- **State Inspection** - View current folders, content counts, files
- **JSON Data** - Inspect database records
- **Console Output** - All logs in one place

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works on desktop, tablet, mobile
- **Drag & Drop** - Upload files by dragging into the interface
- **Thumbnail Preview** - See images before uploading
- **Type Badges** - Color-coded badges for content types
- **Hover Effects** - Smooth animations and transitions
- **Loading States** - Clear feedback during operations

---

## 📊 Architecture Overview

### Database Structure

```
Supabase:
├── folders (metadata)
│   ├── title, slug, table_name
│   ├── is_public (determines content table)
│   └── item_count (auto-updated)
│
├── content_public (public library)
│   ├── folder_id, table_name
│   ├── title, url, external_url
│   ├── thumbnail_url, type
│   └── view_count, last_page
│
└── content_private (courses/premium)
    ├── folder_id, table_name
    ├── title, url, external_url
    ├── access_level, password_hash
    └── allowed_users[]
```

### Data Flow

```
Admin Dashboard
    ↓
Supabase (structured data)
    ↓
Cloudflare R2 (media files)
    ↓
GitHub Actions (daily cron)
    ↓
Puppeteer (generate screenshots)
    ↓
R2 (upload thumbnails) → Supabase (update links)
    ↓
Public Library (display)
```

---

## 🚀 Quick Start

### Step 1: Run Database Schema (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy all content from `supabase-schema.sql`
3. Paste and click "Run"
4. Verify tables created: `folders`, `content_public`, `content_private`, `user_interactions`

### Step 2: Configure Application (2 minutes)

Update `config.js`:
```javascript
const CONFIG = {
    supabase: {
        url: 'YOUR-SUPABASE-URL',
        anonKey: 'YOUR-ANON-KEY',
    },
    r2: {
        publicUrl: 'https://files.3c-public-library.org',
        uploadEndpoint: 'https://api.3c-public-library.org/api/upload',
    },
    features: {
        useCloudflareR2: true,  // false for testing
        enableSupabaseSync: true,
    }
};
```

### Step 3: Test Locally (5 minutes)

```bash
cd Dashboard-library
python3 -m http.server 8000

# Open in browser:
# Admin: http://localhost:8000/admin.html
# Library: http://localhost:8000/library-enhanced.html
```

### Step 4: Create Your First Folder

1. Open admin dashboard
2. Enter Supabase credentials and connect
3. Create folder:
   - Title: "Getting Started"
   - Table Name: "getting_started"
   - Visibility: Public
4. Add content and test!

---

## 📚 Documentation

### Setup Guides
- **[SETUP-ENHANCED.md](SETUP-ENHANCED.md)** - Complete setup guide (start here!)
- **[SUPABASE-SETUP.md](SUPABASE-SETUP.md)** - Database configuration
- **[CLOUDFLARE-R2-SETUP.md](CLOUDFLARE-R2-SETUP.md)** - File storage setup
- **[GITHUB-SETUP.md](GITHUB-SETUP.md)** - Deployment automation

### Testing & Usage
- **[TESTING-GUIDE.md](TESTING-GUIDE.md)** - Comprehensive testing checklist
- **[READY-TO-TEST.md](READY-TO-TEST.md)** - Quick start for testing
- **[TWO-TABLE-STRUCTURE.md](TWO-TABLE-STRUCTURE.md)** - Architecture explained

### Technical Details
- **[ENHANCEMENTS-PLAN.md](ENHANCEMENTS-PLAN.md)** - Complete feature list
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment overview

---

## 🎯 Use Cases

### 📚 **Public Library**
- Share documents, tutorials, references
- Anyone can view without authentication
- Perfect for open-source documentation

### 🎓 **Online Courses**
- Private content with password protection
- Track student progress and engagement
- Separate public preview from paid content

### 🏢 **Internal Knowledge Base**
- Organize company documents
- Track who viewed what and when
- Easy content management for non-technical users

### 📖 **Digital Publishing**
- Publish PDFs with interactive links
- Auto-generate thumbnails for previews
- Track reader engagement

---

## 💡 Example Workflows

### Workflow 1: Creating Public Content

```
1. Create Folder
   Title: "Anica Coffee Break Chat"
   Table Name: "anica_chats"
   Visibility: Public
   
2. Add Content
   Title: "Episode 1: Getting Started"
   Type: PDF
   File: Upload or paste URL
   Tech URL: https://github.com/example/episode-1
   Thumbnail: Upload screenshot
   
3. Share
   URL: library.html?folder=anica-coffee-break-chat-01
   → Anyone can view
   → Clicks PDF to open enhanced viewer
   → Links in PDF open in draggable modals
```

### Workflow 2: Creating Private Course

```
1. Create Folder
   Title: "React Masterclass"
   Table Name: "react_course"
   Visibility: Private
   
2. Add Course Modules
   → Content goes to content_private table
   → Can add password protection later
   → Track student progress
   
3. Implement Auth (when ready)
   → Add authentication logic
   → Restrict access to enrolled users
```

---

## 🔧 Technical Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with variables
- **Vanilla JavaScript** - No framework dependencies
- **PDF.js** - PDF rendering and link detection

### Backend
- **Supabase** - PostgreSQL database with real-time sync
- **Cloudflare R2** - S3-compatible object storage
- **Cloudflare Workers** - Serverless API endpoints
- **GitHub Actions** - Automated workflows

### Tools & Libraries
- **Puppeteer** - Screenshot generation
- **Supabase JS Client** - Database operations
- **AWS SDK** - R2 uploads (S3-compatible)

---

## 📈 Performance & Scalability

### Optimizations
- ✅ **Lazy Loading** - Content loads only when needed
- ✅ **Indexed Queries** - Fast database lookups
- ✅ **CDN Delivery** - Global content distribution
- ✅ **Compressed Assets** - Optimized file sizes
- ✅ **Efficient Rendering** - Minimal DOM operations

### Scalability
- ✅ **Unlimited Storage** - Cloudflare R2 scales infinitely
- ✅ **Database Pooling** - Supabase handles connections
- ✅ **Horizontal Scaling** - Add more workers as needed
- ✅ **Caching** - Browser and CDN caching

### Costs (Estimated)
- **Supabase Free Tier** - Up to 500MB database, 2GB bandwidth
- **Cloudflare R2** - $0.015/GB storage, $0 bandwidth
- **GitHub Actions** - 2,000 minutes/month free
- **Total** - Can run for free or ~$1-10/month for larger libraries

---

## 🔐 Security Features

### Database Security
- ✅ **Row Level Security (RLS)** - Supabase policies enforce access
- ✅ **Anon Key Safe** - Public key, no sensitive data exposure
- ✅ **Prepared Statements** - SQL injection protection

### File Security
- ✅ **Public Read Only** - R2 bucket configured for read access
- ✅ **No Public Write** - Uploads only through authenticated worker
- ✅ **CORS Configured** - Prevents unauthorized access

### Admin Security
- ⚠️ **No Built-in Auth** - Add Cloudflare Access or similar for production
- 💡 **Recommendation** - Use `.htaccess` or password protection

---

## 🎨 Customization

### Branding
- Update colors in `admin-styles.css` and `library-styles.css`
- Replace logo and favicon
- Customize landing page

### Features
- Toggle R2 vs base64 in `config.js`
- Enable/disable debug panel
- Customize PDF viewer controls

### Workflows
- Modify GitHub Actions schedule
- Add custom analytics
- Integrate with other services

---

## 🐛 Troubleshooting

### Common Issues

**Supabase won't connect**
- Verify URL and anon key are correct
- Check if tables exist in Supabase
- Enable debug panel for detailed logs

**Content not saving**
- Check Supabase connection
- Verify folder is selected
- Check browser console for errors

**PDF links not detected**
- Not all PDFs have link annotations
- Try a different PDF with hyperlinks
- Check browser console

**Screenshots not generating**
- Verify GitHub secrets are set
- Check Actions logs for errors
- Ensure Puppeteer can access URLs

---

## 📦 Project Structure

```
Dashboard-library/
├── Core Application
│   ├── admin.html (enhanced admin dashboard)
│   ├── admin-core.js (admin functionality)
│   ├── admin-styles.css (admin styling)
│   ├── library-enhanced.html (public library)
│   ├── library-core.js (library functionality)
│   ├── library-styles.css (library styling)
│   ├── pdf-viewer-enhanced.js (PDF features)
│   ├── supabase-client.js (database client)
│   ├── config.js (configuration)
│   └── r2-storage.js (R2 integration)
│
├── Database
│   └── supabase-schema.sql (complete schema)
│
├── GitHub Actions
│   ├── .github/workflows/screenshot-generator.yml
│   └── .github/scripts/generate-screenshots.js
│
├── Backend
│   └── worker-api.js (Cloudflare Worker)
│
└── Documentation
    ├── README.md (this file)
    ├── SETUP-ENHANCED.md
    ├── TESTING-GUIDE.md
    ├── TWO-TABLE-STRUCTURE.md
    └── ... (other guides)
```

---

## 🎉 What's New in This Version

### Major Enhancements
- ✅ **Two-Table Architecture** - Public/private content separation
- ✅ **Smart Folder Management** - Title-based with auto-slugs
- ✅ **Individual Content Records** - No more JSON stacks
- ✅ **Form Auto-Reset** - Saves time when adding multiple items
- ✅ **Edit Mode** - Update existing records properly
- ✅ **Debug Panel** - Real-time operation logs
- ✅ **Dual URLs** - File URL + Tech/Reference URL
- ✅ **Enhanced PDF Viewer** - Link detection and modal popups
- ✅ **Draggable Modals** - Move and resize link popups
- ✅ **Auto-Screenshots** - GitHub Actions generates thumbnails
- ✅ **Analytics Tracking** - Views, last page, interactions
- ✅ **Dark Mode** - Beautiful dark theme
- ✅ **Lazy Loading** - Better performance
- ✅ **Playback Memory** - Remembers last position

### Technical Improvements
- ✅ **Proper Relational Schema** - Normalized database structure
- ✅ **Triggers & Functions** - Auto-update item counts
- ✅ **RLS Policies** - Secure access control
- ✅ **Indexed Queries** - Fast database lookups
- ✅ **Error Handling** - Comprehensive error management
- ✅ **TypeScript-Ready** - Clean, typed interfaces

---

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

---

## 📄 License

MIT License - Feel free to use and modify for your projects.

---

## 🙏 Acknowledgments

Built with:
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - S3-compatible storage
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering in JavaScript
- [Puppeteer](https://pptr.dev/) - Headless Chrome for screenshots

---

## 📞 Support

For questions or issues:
1. Check the documentation in this repository
2. Enable debug panel for detailed logs
3. Review browser console for errors
4. Check Supabase and Cloudflare dashboards

---

**Built with ❤️ as part of the 3C Thread To Success ecosystem — designed for learning, exploration, and inspiration within a structured environment.**

**Ready to get started?** Open [SETUP-ENHANCED.md](SETUP-ENHANCED.md) and follow the 5-step quick start!

---

## 🎨 Credits

**Designed by Claude** - AI Assistant by Anthropic
- Flipbook Viewer System with Event Delegation
- Presentation Viewer System with Event Delegation
- Video Playback Integration & Media Handling
- Zoom Controls & Interactive Element Rendering
- Emoji Support & URL Protocol Validation
- Private Library Authentication System

---

## 👤 Creator

Anica-blip (“Chef”)
Founder of 3C Thread To Success
Independent Creator | Community Builder

### 🧠 Philosophy

“Think it. Do it. Own it.”

This project was built from vision, persistence, and a commitment to creating meaningful and structured experiences — even with minimal resources.

**Created for 3C Thread To Success Ecosystem**
