# 3C Content Library - Architecture & Setup

## System Architecture

### Data Loading Architecture

The 3C Content Library uses a **two-tier architecture** for optimal performance:

#### 1. Folder Metadata (Supabase Database)
**What loads from Supabase:**
- Folder structure (root folders and sub-folders)
- Folder titles (e.g., `anica_chats`)
- Folder slugs/URLs
- Sub-folder counts
- Item counts per folder (`actual_item_count`)
- Folder hierarchy (parent/child relationships)

**When it loads:**
- On initial page load
- When navigating to folder pages via `?folder=slug`

**Database View Used:**
- `folders_with_stats` - Provides folder metadata with calculated item counts

#### 2. Content Files (Cloudflare R2)
**What loads from Cloudflare R2:**
- PDF files
- Flipbook JSON manifests
- Thumbnails/images
- Video files
- All actual content assets

**When it loads:**
- When content is opened as a standalone page via `?content=id`
- Content loads **directly from Cloudflare R2 URLs** stored in the database
- **No dependency on folder context** - content pages are standalone and fast

**Key Point:**
Once you click to open content from a root or sub-folder, that content opens from **Cloudflare R2 as a standalone landing page**. Supabase is **NOT** attached to loading that content - only the initial folder metadata comes from Supabase.

### URL Structure

#### Folder Pages
```
?folder=slug
```
- Loads folder metadata from Supabase
- Displays folder contents (subfolders and content thumbnails)
- Example: `?folder=anica_chats`

#### Standalone Content Pages (NEW FORMAT - CURRENT)
```
?folder=table_name&url=custom_url&view=pdf-only
?folder=table_name&url=custom_url&view=flipbook-only
```
- **folder** = `table_name` column from database (e.g., `anica_chats`, `aurion_reports`, `foundation`)
- **url** = `custom_url` column from database (e.g., `anica_chats_issue.08`, `flow_under_friction_level.2`)
- **view** = `pdf-only` or `flipbook-only` (hides sidebar, shows only content)
- Files load from `url` column (Cloudflare R2 URL)
- Works for both `content_public` and `content_private` tables

**Examples:**
- PDF: `?folder=anica_chats&url=anica_chats_issue.08&view=pdf-only`
- Flipbook: `?folder=foundation&url=flow_under_friction_level.2&view=flipbook-only`

#### Legacy Content Pages (BACKWARD COMPATIBILITY)
```
?content=id&view=pdf-only
```
- Still supported for old links
- Example: `?content=abc123&view=pdf-only`

### Content Types Supported

1. **PDF Documents**
   - Thumbnail stored in R2
   - PDF file stored in R2
   - Opens in modal viewer

2. **Flipbook Documents**
   - JSON manifest stored in R2
   - Opens in `flipbook-viewer.html?manifest=R2_URL`
   - Interactive page-turning experience

3. **Videos**
   - Video files stored in R2
   - Embedded or iframe display

4. **Images**
   - Image files stored in R2
   - Direct display

5. **Audio**
   - Audio files stored in R2
   - Audio player controls

### Performance Benefits

- **Fast folder browsing**: Lightweight metadata from Supabase
- **Fast content loading**: Direct R2 URLs, no database queries
- **Standalone content**: Share direct links that load instantly
- **Scalable**: R2 handles all heavy content delivery

## Setup Instructions

### Prerequisites
- Supabase account (for folder metadata)
- Cloudflare R2 account (for content storage)
- GitHub repository

### Configuration Files
- `config.js` - Supabase credentials
- `supabase-client.js` - Database client
- `library.html` - Public library interface
- `admin.html` - Admin content management

### Deployment
- Frontend: Cloudflare Pages (auto-deploy from GitHub)
- Database: Supabase (PostgreSQL)
- Storage: Cloudflare R2 (object storage)

## Key Features

### Folder Management
- Root folders and unlimited sub-folder depth
- Accurate item counts from database view
- Folder hierarchy navigation
- Copy folder links for sharing

### Content Management
- Upload content via admin panel
- Automatic R2 storage
- Thumbnail generation
- Metadata stored in Supabase

### User Experience
- Fast standalone content pages
- Copy link buttons on all content
- Mobile-responsive design
- Left-aligned logo/title, right-aligned navigation
- Clean, modern UI with purple theme

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Cloudflare R2
- **Hosting**: Cloudflare Pages
- **PDF Viewer**: PDF.js
- **Flipbook**: Turn.js

## Database Schema

### Key Tables
- `folders` - Folder structure and metadata
- `content_public` - Public content metadata
- `content_private` - Private content metadata

### Key Views
- `folders_with_stats` - Folders with calculated item counts

### Important Fields
- `actual_item_count` - Accurate count of items in folder (from view)
- `custom_url` - Custom slug for folders/content
- `url` - Cloudflare R2 URL for content files
- `thumbnail_url` - Cloudflare R2 URL for thumbnails
- `project_json` - Flipbook manifest URL (for interactive PDFs)

## Critical Architecture Notes

### Database vs File Storage (IMPORTANT)
- **Supabase** = Database only (metadata, folder structure, content info)
- **Cloudflare R2** = All files loaded from R2 via `url` column

### URL Structure for Both Public & Private Libraries

**content_public:**
- folder = `table_name` column
- content = `custom_url` column
- fileload = `url` column (Cloudflare R2)

**content_private:**
- folder = `table_name` column
- content = `custom_url` column
- fileload = `url` column (Cloudflare R2)

### UI Design Guidelines
- **Landing pages**: Do NOT add containers in sidebars (unless specifically required)
- **Content viewing**: Hide sidebar when `view=pdf-only` or `view=flipbook-only`
- **Clean interface**: Minimal clutter, focus on content
