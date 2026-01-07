# 3C Content Library - Architecture Documentation

**Version:** 2.0  
**Last Updated:** January 7, 2026  
**Purpose:** Comprehensive reference for understanding the complete 3C Content Library system architecture

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Public Library Structure](#public-library-structure)
3. [Navigation Flow](#navigation-flow)
4. [Supabase Database Schema](#supabase-database-schema)
5. [Admin Panel Structure](#admin-panel-structure)
6. [File Structure](#file-structure)
7. [Key Components](#key-components)
8. [URL Structure & Routing](#url-structure--routing)
9. [Content Viewers](#content-viewers)
10. [Mobile Responsiveness](#mobile-responsiveness)

---

## System Overview

The 3C Content Library is a dual-sided content management and delivery system:

### 1. **Admin Editor Content Library** (`admin.html`)
- Content creation and management interface
- Folder and sub-folder organization
- Upload and configure content items
- Manage public/private content visibility
- Password protection for private folders

### 2. **3C Public Library** (`library.html` / `private-library.html`)
- Public-facing content delivery system
- Hierarchical folder navigation
- Content viewing with PDF and Flipbook viewers
- Direct content linking
- Mobile-optimized interface

---

## Public Library Structure

### 1. Main Page - Folders Landing

**Display:**
- Root folders with sub-folders inside
- Each folder card shows:
  - **Folder Name** (`title` from `folders` table)
  - **Sub-folder Count** (count of child folders where `parent_id = folder.id`)
  - **Item Count** (`item_count` column, auto-updated by triggers)
  - **Folder Type** (`type_name` column - deprecated, use `table_name` instead)

**Data Source:**
- `folders` table where `parent_id IS NULL` (root folders)
- `is_public = true` for public library
- `is_public = false` for private library

**Example:**
```
┌─────────────────────────────────┐
│  📁 Anica Coffee Break Chats    │
│  3 sub-folders • 12 items       │
└─────────────────────────────────┘
```

---

### 2. Folder Sidebar Navigation

**Triggered by:** Clicking on a folder card

**Display:**
- **Left Sidebar** opens with:
  - Root folder items (if any exist directly in root)
    - Shows item count
    - "View Content" button → opens Landing Page 1
  - Sub-folder list
    - Sub-folder title
    - Item count
    - Arrow `>` button → opens Landing Page 1 for sub-folder

**Behavior:**
- Desktop: Sidebar slides in from left
- Mobile: Full-screen overlay with close button

---

### 3. Landing Page 1 - Folder/Sub-folder Content View

**URL Format:**
```
library.html?folder=<table_name>
```

**Layout:**

#### Desktop View:
```
┌──────────────┬────────────────────────────────┐
│              │  Folder Title (from type_name) │
│  Left        │  ────────────────────────────  │
│  Sidebar     │                                │
│              │  Right Sidebar                 │
│  Thumbnail   │  (Content Details)             │
│  Grid        │                                │
│              │                                │
└──────────────┴────────────────────────────────┘
```

#### Mobile View:
```
┌────────────────────────────────┐
│  📁 [Folder Icon - Top Right]  │
│  Folder Title                  │
├────────────────────────────────┤
│  Thumbnail Grid                │
│  (Full width)                  │
│                                │
│  Click thumbnail →             │
│  Opens right sidebar           │
└────────────────────────────────┘
```

**Left Sidebar Content:**
- Thumbnail grid of all content items in folder
- Each item shows:
  - Thumbnail image (`thumbnail_url`)
  - Title (`title`)
  - Type indicator (PDF/Flipbook icon)

**Right Sidebar Content (when item clicked):**
1. **Title** - Content title
2. **Description** - Content description
3. **Back Button**
   - Desktop: Returns to thumbnail grid view
   - Mobile: Returns to left sidebar thumbnail list
4. **Copy Link Button** - Copies direct content link (Landing Page 2 format)
5. **Thumbnail Image** - Large preview
6. **Action Button:**
   - "Click to View PDF" (for PDF content)
   - "Click to View Flipbook" (for Flipbook content)
7. **Comments Section** - "Leave a comment" area

---

### 4. Landing Page 2 - Direct Content Link (No Left Sidebar)

**URL Format:**
```
library.html?folder=<table_name>&content=<custom_url>
```

**Purpose:**
- Shareable direct links to specific content
- Opens content immediately without folder navigation
- No left sidebar (content-only view)

**Layout:**
```
┌────────────────────────────────┐
│  📁 [Folder Icon - Mobile Only]│
│                                │
│  Content Viewer                │
│  (Full width)                  │
│                                │
│  • Title + Description         │
│  • Thumbnail                   │
│  • View PDF/Flipbook Button    │
│  • Comments                    │
└────────────────────────────────┘
```

**Example Use Case:**
- User views "Foundation" flipbook in Landing Page 1
- Clicks "Copy Link" button
- Shares link: `library.html?folder=foundation&content=foundation-flipbook-01`
- Recipient opens link → sees only the flipbook content (no sidebar)

---

## Navigation Flow

```
Main Page (Folders)
    │
    ├─→ Click Folder
    │       │
    │       └─→ Sidebar Opens
    │               │
    │               ├─→ Root Folder Items
    │               │       └─→ "View Content" → Landing Page 1
    │               │
    │               └─→ Sub-folder List
    │                       └─→ Click Arrow → Landing Page 1
    │
    └─→ Landing Page 1 (Folder Content)
            │
            ├─→ Click Thumbnail → Right Sidebar Opens
            │       │
            │       ├─→ View Details
            │       ├─→ Copy Link (generates Landing Page 2 URL)
            │       └─→ Click "View PDF/Flipbook" → Opens Viewer
            │
            └─→ Direct Link (Landing Page 2)
                    └─→ Content Only (No Left Sidebar)
```

---

## Supabase Database Schema

### Tables Overview

```
folders (Root & Sub-folders)
    ├─→ content_public (Public content items)
    └─→ content_private (Private content items)

folder_passwords (Password protection for private folders)
user_interactions (Analytics tracking)
```

---

### 1. `folders` Table

**Purpose:** Store all folders (root and sub-folders)

**Key Columns:**

| Column | Type | Description | Usage |
|--------|------|-------------|-------|
| `id` | UUID | Primary key | Unique folder identifier |
| `title` | TEXT | Display name | "Anica Coffee Break Chats" |
| `slug` | TEXT | Auto-generated URL slug | "anica-coffee-break-chats" |
| `table_name` | TEXT | **CRITICAL** - Logical grouping name | "anica_chats" (used in URLs) |
| `custom_url` | TEXT | Custom URL override | Optional, overrides `slug` |
| `description` | TEXT | Folder description | Shown in folder cards |
| `is_public` | BOOLEAN | Visibility flag | `true` = public, `false` = private |
| `item_count` | INTEGER | Total items in folder | Auto-updated by triggers |
| `parent_id` | UUID | Parent folder reference | `NULL` for root folders |
| `folder_type` | TEXT | Folder hierarchy type | "root" or "sub_root" |
| `depth` | INTEGER | Nesting level | 0 for root, 1+ for sub-folders |
| `display_order` | INTEGER | Sort order | For ordering folders |

**Important Notes:**
- **`table_name`** is used for URL routing: `?folder=<table_name>`
- **`custom_url`** takes precedence over `slug` if set
- Root folders: `parent_id IS NULL`
- Sub-folders: `parent_id = <parent_folder_id>`

---

### 2. `content_public` Table

**Purpose:** Store public content items

**Key Columns:**

| Column | Type | Description | Usage |
|--------|------|-------------|-------|
| `id` | UUID | Primary key | Unique content identifier |
| `folder_id` | UUID | Parent folder | References `folders.id` |
| `table_name` | TEXT | **CRITICAL** - Folder's table name | Copied from parent folder |
| `slug` | TEXT | Auto-generated URL slug | "anica-chats-01" |
| `custom_url` | TEXT | **CRITICAL** - Custom URL identifier | Used in direct links |
| `title` | TEXT | Content title | Display name |
| `type` | TEXT | Content type | "pdf", "flipbook", "video", "image", "audio", "link" |
| `url` | TEXT | Primary content URL | R2/Cloudflare URL or external |
| `external_url` | TEXT | Additional reference URL | Optional |
| `thumbnail_url` | TEXT | Thumbnail image URL | Shown in grid view |
| `description` | TEXT | Content description | Shown in right sidebar |
| `file_size` | BIGINT | File size in bytes | For display |
| `project_json` | TEXT | Flipbook JSON data | For interactive flipbooks |
| `display_order` | INTEGER | Sort order | For ordering content |
| `view_count` | INTEGER | View counter | Analytics |
| `metadata` | JSONB | Additional metadata | Flexible storage |

**Important Notes:**
- **`custom_url`** is used for direct content links: `?folder=<table_name>&content=<custom_url>`
- **`table_name`** must match parent folder's `table_name`
- Content types: `pdf`, `flipbook`, `video`, `image`, `audio`, `link`

---

### 3. `content_private` Table

**Structure:** Identical to `content_public` with additional columns:

| Column | Type | Description |
|--------|------|-------------|
| `access_level` | TEXT | "basic", "premium", "course_specific" |
| `password_hash` | TEXT | Password protection |
| `allowed_users` | UUID[] | Array of authorized user IDs |

---

### 4. `folder_passwords` Table

**Purpose:** Password protection for private folders

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `folder_id` | UUID | References `folders.id` |
| `password_hash` | TEXT | Hashed password |
| `password_plain` | TEXT | Plain text (for admin view) |
| `user_identifier` | TEXT | Email or name |
| `expires_at` | TIMESTAMP | Optional expiration |
| `is_active` | BOOLEAN | Active status |

---

## Admin Panel Structure

### Admin Interface (`admin.html`)

**Sections:**

1. **Folder Management**
   - Create root folders
   - Create sub-folders (select parent)
   - Edit folder properties
   - Delete folders (cascades to content)
   - Reorder folders (drag & drop)

2. **Content Management**
   - Upload content files (PDF, images, videos)
   - Create flipbook documents (JSON upload)
   - Set custom URLs
   - Edit metadata (title, description, thumbnail)
   - Reorder content items
   - Delete content

3. **Settings**
   - Public/Private visibility toggle
   - Password protection setup
   - Table name configuration
   - Display order management

**Key Features:**
- Real-time preview
- Drag-and-drop file upload
- Auto-generated slugs
- Custom URL override
- Cloudflare R2 integration

**Missing Feature (To Be Fixed):**
- ⚠️ Up/down arrows for reordering items in sub-folders

---

## File Structure

```
3c-content-library-main/
├── index.html                      # Landing page / redirect
├── library.html                    # Public library interface
├── private-library.html            # Private library interface
├── admin.html                      # Admin panel
│
├── library-core.js                 # Public library logic
├── private-library-core.js         # Private library logic
├── admin-core.js                   # Admin panel logic
├── supabase-client.js              # Supabase API wrapper
│
├── flipbook-viewer.html            # Flipbook viewer interface
├── flipbook-viewer.js              # Flipbook viewer logic
├── pdf-viewer-enhanced.js          # PDF viewer logic
├── interactive-pdf-viewer.html     # Interactive PDF viewer
│
├── admin-styles.css                # Admin panel styles
├── config.js                       # Configuration (Supabase keys)
│
├── cloudflare-worker.js            # Cloudflare Worker API
├── worker-api.js                   # Worker API routes
├── r2-storage.js                   # R2 storage integration
├── wrangler.toml                   # Cloudflare Worker config
│
├── supabase-schema.sql             # Database schema
├── verify-database.sql             # Database verification
├── password-utils.js               # Password hashing utilities
│
├── DOC/
│   └── VIDEO_FIXES.md              # Flipbook video fixes documentation
│
├── .github/
│   └── workflows/
│       └── cloudflare-worker.yml   # CI/CD for Worker deployment
│
└── README.md                       # Project documentation
```

---

## Key Components

### 1. Library Core (`library-core.js`)

**Functions:**

- `loadFolders()` - Fetch all folders from Supabase
- `loadAllContent()` - Fetch all content items
- `loadFolderContent(folderId)` - Fetch content for specific folder
- `displayFolders()` - Render folder cards on main page
- `displayContent(folderSlug, contentSlug)` - Render content view
- `openContent(content)` - Open content in viewer
- `showViewer(content, showSidebar)` - Display content details

**URL Parameter Handling:**

```javascript
const params = new URLSearchParams(window.location.search);
const folderSlug = params.get('folder');    // table_name
const contentSlug = params.get('content');  // custom_url
```

**Routing Logic:**

```javascript
if (!folderSlug && !contentSlug) {
    // Main page - show folders
    displayFolders();
} else if (folderSlug && !contentSlug) {
    // Landing Page 1 - folder with sidebar
    displayContent(folderSlug);
} else if (folderSlug && contentSlug) {
    // Landing Page 2 - direct content link (no sidebar)
    displayContent(folderSlug, contentSlug);
}
```

---

### 2. Supabase Client (`supabase-client.js`)

**Key Methods:**

```javascript
// Folders
getFolders()                    // Get all folders
createFolder(folderData)        // Create new folder
updateFolder(id, updates)       // Update folder
deleteFolder(id)                // Delete folder

// Content
getContent(id)                  // Get single content by ID
getFolderContent(folderId)      // Get all content in folder
createContent(contentData)      // Create new content
updateContent(id, updates)      // Update content
deleteContent(id)               // Delete content

// Slug Generation
generateSlug(title)             // Generate folder slug
generateContentSlug(title, folderId, tableName)  // Generate content slug
```

**Important Column Usage:**

```javascript
// Folder URL routing
folder.table_name               // Used in ?folder=<table_name>
folder.custom_url || folder.slug  // Display URL

// Content URL routing
content.custom_url              // Used in ?content=<custom_url>
content.table_name              // Must match folder.table_name
```

---

### 3. Admin Core (`admin-core.js`)

**Key Functions:**

- `loadFolders()` - Load folders for admin view
- `loadContent()` - Load content for admin view
- `createFolder()` - Create new folder with validation
- `editFolder(id)` - Edit existing folder
- `deleteFolder(id)` - Delete folder (with confirmation)
- `createContent()` - Upload and create content
- `editContent(id)` - Edit existing content
- `deleteContent(id)` - Delete content (with confirmation)
- `reorderFolders()` - Drag-and-drop reordering
- `reorderContent()` - Drag-and-drop reordering

**Custom URL Suggestions:**

```javascript
// For sub-folders
parentURL = parent.custom_url || parent.slug;
suggestion = `${parentURL}_sub.01`;

// For content
folderURL = folder.custom_url || folder.slug;
suggestion = `${folderURL}_content.01`;
```

---

## URL Structure & Routing

### Public Library URLs

**Main Page (Folders):**
```
https://3c-public-library.org/library.html
```

**Landing Page 1 (Folder with Sidebar):**
```
https://3c-public-library.org/library.html?folder=<table_name>

Example:
https://3c-public-library.org/library.html?folder=anica_chats
```

**Landing Page 2 (Direct Content Link):**
```
https://3c-public-library.org/library.html?folder=<table_name>&content=<custom_url>

Example:
https://3c-public-library.org/library.html?folder=foundation&content=foundation-flipbook-01
```

**PDF Viewer:**
```
https://3c-public-library.org/library.html?folder=<table_name>&url=<custom_url>&view=pdf-only

Example:
https://3c-public-library.org/library.html?folder=anica_chats&url=chat-episode-01&view=pdf-only
```

**Flipbook Viewer:**
```
https://3c-public-library.org/flipbook-viewer.html?manifest=<r2_url>

Example:
https://3c-public-library.org/flipbook-viewer.html?manifest=https://files.3c-public-library.org/flipbooks/project.json
```

---

### Private Library URLs

**Main Page:**
```
https://3c-public-library.org/private-library.html
```

**Folder View:**
```
https://3c-public-library.org/private-library.html?folder=<table_name>
```

**Direct Content:**
```
https://3c-public-library.org/private-library.html?folder=<table_name>&content=<custom_url>
```

---

## Content Viewers

### 1. PDF Viewer

**File:** `pdf-viewer-enhanced.js`

**Features:**
- Page navigation (prev/next, jump to page)
- Zoom controls (fit width, fit page, custom zoom)
- Full-screen mode
- Page thumbnails sidebar
- Search functionality
- Download button
- Print support

**Trigger:**
- Click "Click to View PDF" button
- Opens in modal overlay

---

### 2. Flipbook Viewer

**File:** `flipbook-viewer.js` + `flipbook-viewer.html`

**Features:**
- Turn.js page-turning animation
- Interactive elements (buttons, hotspots, videos)
- Video popup overlay with orientation detection
- Page navigation controls
- Zoom controls
- Download as PDF
- Full-screen mode

**Video Fixes Applied (VIDEO_FIXES.md):**
1. **Z-index Fix** - Videos now clickable (z-index: 1000)
2. **Purple Box** - Videos without thumbnails show play icon
3. **IIFE Closure** - Multiple videos work correctly
4. **Complete Cleanup** - Videos play properly after closing
5. **Orientation Detection** - Auto-detects 16:9 (landscape) or 9:16 (portrait)

**Trigger:**
- Click "Click to View Flipbook" button
- Opens in new page: `flipbook-viewer.html?manifest=<url>`

---

### 3. Interactive PDF Viewer

**File:** `interactive-pdf-viewer.html`

**Purpose:**
- Editor for creating interactive flipbooks
- Add buttons, hotspots, videos to PDF pages
- Export as JSON for flipbook viewer

**Not used in public library** - Admin tool only

---

## Mobile Responsiveness

### Mobile-Specific Features

**1. Folder Icon (Top Right)**
- **Visibility:** ONLY on mobile view (max-width: 767px)
- **Location:** Top right corner of header
- **Purpose:** Navigate back to main folders page
- **Display Logic:**
  - Hidden on main folders page
  - Visible on Landing Page 1 (folder view)
  - Visible on Landing Page 2 (direct content link)

**CSS:**
```css
@media (max-width: 767px) {
    #folderIconBtn {
        display: flex !important;
    }
}
```

**JavaScript:**
```javascript
if (folderSlug || contentSlug || contentUrl) {
    folderIconBtn.style.visibility = 'visible';
} else {
    folderIconBtn.style.visibility = 'hidden';
}
```

**2. Sidebar Behavior**
- Desktop: Slides in from left, content shifts right
- Mobile: Full-screen overlay, close button in top right

**3. Back Button**
- Desktop: Returns to thumbnail grid (left sidebar stays open)
- Mobile: Returns to thumbnail list (closes right sidebar)

**4. Responsive Grid**
- Desktop: 4-5 columns
- Tablet: 3 columns
- Mobile: 2 columns

---

## Critical Column Usage Reference

### ✅ CORRECT Column Usage

**For Folders:**
- **URL Routing:** Use `table_name` in `?folder=<table_name>`
- **Display URL:** Use `custom_url` OR `slug` (custom_url takes precedence)
- **Example:**
  ```javascript
  const folderURL = folder.table_name;  // For routing
  const displayURL = folder.custom_url || folder.slug;  // For display
  ```

**For Content:**
- **URL Routing:** Use `custom_url` in `?content=<custom_url>`
- **Table Matching:** `content.table_name` must equal `folder.table_name`
- **Example:**
  ```javascript
  const contentURL = content.custom_url;  // For routing
  const tableName = content.table_name;   // Must match folder
  ```

### ❌ DEPRECATED (Do Not Use)

- **`type_name`** - Old column, replaced by `table_name`
- **`slug` for routing** - Use `table_name` for folders, `custom_url` for content

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Admin      │  │   Public     │  │   Private    │     │
│  │   Panel      │  │   Library    │  │   Library    │     │
│  │ admin.html   │  │ library.html │  │ private-     │     │
│  │              │  │              │  │ library.html │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │             │
├─────────┼─────────────────┼──────────────────┼─────────────┤
│         │                 │                  │             │
│  ┌──────▼─────────────────▼──────────────────▼───────┐     │
│  │           JAVASCRIPT CORE LOGIC                   │     │
│  │  • admin-core.js                                  │     │
│  │  • library-core.js                                │     │
│  │  • private-library-core.js                        │     │
│  │  • supabase-client.js                             │     │
│  └──────────────────────┬────────────────────────────┘     │
│                         │                                  │
├─────────────────────────┼──────────────────────────────────┤
│                         │                                  │
│  ┌──────────────────────▼────────────────────────────┐     │
│  │           SUPABASE DATABASE                       │     │
│  │  ┌─────────────┐  ┌──────────────┐               │     │
│  │  │   folders   │  │   content_   │               │     │
│  │  │             │  │   public     │               │     │
│  │  └─────────────┘  └──────────────┘               │     │
│  │  ┌─────────────┐  ┌──────────────┐               │     │
│  │  │   folder_   │  │   content_   │               │     │
│  │  │  passwords  │  │   private    │               │     │
│  │  └─────────────┘  └──────────────┘               │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │           CLOUDFLARE INFRASTRUCTURE              │      │
│  │  ┌──────────────┐  ┌──────────────┐             │      │
│  │  │  R2 Storage  │  │   Workers    │             │      │
│  │  │  (Files)     │  │   (API)      │             │      │
│  │  └──────────────┘  └──────────────┘             │      │
│  │  ┌──────────────┐                                │      │
│  │  │    Pages     │                                │      │
│  │  │  (Hosting)   │                                │      │
│  │  └──────────────┘                                │      │
│  └──────────────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### Example 1: User Views Folder Content

```
1. User clicks "Anica Coffee Break Chats" folder
   ↓
2. JavaScript: loadFolderContent(folder.id)
   ↓
3. Supabase: SELECT * FROM content_public WHERE folder_id = ?
   ↓
4. JavaScript: displayContent(folder.table_name)
   ↓
5. UI: Renders thumbnail grid in left sidebar
   ↓
6. User clicks thumbnail
   ↓
7. JavaScript: showViewer(content, true)
   ↓
8. UI: Opens right sidebar with content details
```

### Example 2: User Shares Direct Content Link

```
1. User on Landing Page 1, viewing content in right sidebar
   ↓
2. User clicks "Copy Link" button
   ↓
3. JavaScript generates URL:
   library.html?folder=foundation&content=foundation-flipbook-01
   ↓
4. URL copied to clipboard
   ↓
5. Recipient opens link
   ↓
6. JavaScript detects contentSlug parameter
   ↓
7. Loads content WITHOUT left sidebar (Landing Page 2)
   ↓
8. UI: Shows content viewer only (full width)
```

### Example 3: Admin Creates New Content

```
1. Admin opens admin.html
   ↓
2. Clicks "Add Content" button
   ↓
3. Selects folder: "Foundation"
   ↓
4. Uploads PDF file
   ↓
5. JavaScript: uploadToR2(file)
   ↓
6. Cloudflare Worker: Uploads to R2 storage
   ↓
7. Returns R2 URL: https://files.3c-public-library.org/...
   ↓
8. JavaScript: createContent({
      folder_id: folder.id,
      table_name: "foundation",
      custom_url: "foundation-flipbook-01",
      url: r2_url,
      ...
   })
   ↓
9. Supabase: INSERT INTO content_public
   ↓
10. Trigger: Updates folder.item_count
   ↓
11. UI: Refreshes content list
```

---

## Best Practices

### 1. URL Structure
- **Always use `table_name` for folder routing**
- **Always use `custom_url` for content routing**
- Keep URLs short and descriptive
- Use underscores for table names: `anica_chats`
- Use hyphens for custom URLs: `anica-chats-01`

### 2. Content Organization
- Root folders for main categories
- Sub-folders for sub-categories
- Use descriptive titles
- Add thumbnails for all content
- Write clear descriptions

### 3. Database Operations
- Let triggers handle `item_count` updates
- Use `custom_url` for human-readable URLs
- Always set `table_name` to match parent folder
- Use `display_order` for custom sorting

### 4. Mobile Optimization
- Test all features on mobile devices
- Ensure folder icon appears correctly
- Verify sidebar behavior
- Check responsive grid layout

---

## Known Issues & Future Improvements

### Current Issues
1. ⚠️ **Missing up/down arrows** for reordering items in sub-folders (admin panel)
2. Need to fully deprecate `type_name` column (replace all references with `table_name`)

### Planned Improvements
1. Add drag-and-drop reordering for sub-folder content
2. Implement user authentication for private library
3. Add analytics dashboard
4. Improve search functionality
5. Add content tagging system
6. Implement content versioning

---

## Troubleshooting

### Issue: Content not showing in folder
**Check:**
- `content.folder_id` matches `folder.id`
- `content.table_name` matches `folder.table_name`
- `content.is_public` matches folder visibility
- Content has valid `url` or `project_json`

### Issue: Direct link not working
**Check:**
- URL format: `?folder=<table_name>&content=<custom_url>`
- `custom_url` exists in database
- `table_name` matches folder
- Content is public (for public library)

### Issue: Folder icon not showing on mobile
**Check:**
- Screen width < 767px
- JavaScript sets `visibility: 'visible'`
- CSS media query applied
- Element ID is `folderIconBtn`

---

## Version History

**v2.0** (January 7, 2026)
- Added mobile folder icon
- Fixed direct content links (Landing Page 2)
- Applied flipbook video fixes
- Added video orientation detection
- Updated documentation

**v1.0** (Initial Release)
- Basic folder/content structure
- Public/private library separation
- Admin panel
- PDF and flipbook viewers

---

## Support & Contact

For questions or issues, refer to:
- `README.md` - Setup instructions
- `SETUP.md` - Deployment guide
- `DOC/VIDEO_FIXES.md` - Flipbook video fixes
- GitHub Issues - Bug reports

---

**End of Architecture Documentation**
