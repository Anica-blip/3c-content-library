# 3C Content Library - Architecture Documentation

**Version:** 3.0  
**Last Updated:** January 28, 2026  
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
11. [Nested Subfolder System](#nested-subfolder-system)
12. [Presentation Viewer System](#presentation-viewer-system)
13. [Interactive PDF Integration](#interactive-pdf-integration)

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
- Hierarchical folder navigation with unlimited nesting
- Content viewing with PDF, Flipbook, and Presentation viewers
- Direct content linking
- Mobile-optimized interface
- Scrollable folder sections for large collections

---

## Public Library Structure

### 1. Main Page - Folders Landing

**Display:**
- Root folders with sub-folders inside
- Each folder card shows:
  - **Folder Name** (`title` from `folders` table)
  - **Sub-folder Count** (count of child folders where `parent_id = folder.id`)
  - **Item Count** (`item_count` column, auto-updated by triggers)

**Data Source:**
- `folders` table where `parent_id IS NULL` (root folders)
- `is_public = true` for public library
- `is_public = false` for private library

**Example:**
```
┌─────────────────────────────────┐
│  📁 Anica Coffee Break Chats    │
│  3 sub-folders • 12 items       │
│  table_name: anica_chats        │
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
   - Desktop: Returns to folders (main page)
   - Mobile: Returns to left sidebar thumbnail list (allows user to view thumbnails and open another document)
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
- Desktop: Returns to folders (main page)
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

## Nested Subfolder System

### Overview
**Version:** 3.0 (January 28, 2026)

The 3C Content Library now supports **unlimited nesting** of subfolders, allowing complex hierarchical organization of content.

### Key Features

1. **Unlimited Depth**
   - Subfolders can contain other subfolders
   - No limit on nesting levels
   - Root → Subfolder → Sub-subfolder → Sub-sub-subfolder...

2. **Hierarchical Display**
   - Admin panel shows folders with indentation
   - Public library displays subfolders when viewing folders
   - Clear visual hierarchy with folder icons (📁 root, 📂 subfolder)

3. **Circular Reference Prevention**
   - Folders cannot be their own parent
   - Folders cannot be descendants of themselves
   - `isDescendant()` function validates parent selection

### Admin Panel Implementation

**Create/Edit Folder UI:**
```
Folder Type: [Root Folder ▼]
             [Sub-Folder (requires parent) ▼]

Parent Folder: [-- Select Parent Folder --]
               [📁 Root Folder 1]
               [  └─ 📂 Subfolder 1.1]
               [    └─ 📂 Subfolder 1.1.1]
               [📁 Root Folder 2]
```

**Key Functions (`admin-core.js`):**

```javascript
// Populate parent folder dropdown with hierarchy
function updateFolderSelects() {
    const addFolderWithChildren = (folder, indent = '') => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = `${indent}${folder.folder_type === 'root' ? '📁' : '📂'} ${folder.title}`;
        select.appendChild(option);
        
        // Recursively add subfolders
        const subfolders = folders.filter(sf => sf.parent_id === folder.id);
        subfolders.forEach(sf => {
            addFolderWithChildren(sf, indent + '  └─ ');
        });
    };
}

// Prevent circular references
function editFolder(folderId) {
    const isDescendant = (potentialDescendant, ancestorId) => {
        if (potentialDescendant.id === ancestorId) return true;
        if (!potentialDescendant.parent_id) return false;
        const parent = folders.find(f => f.id === potentialDescendant.parent_id);
        return parent ? isDescendant(parent, ancestorId) : false;
    };
    
    // Don't allow selecting itself or descendants as parent
    if (f.id !== folder.id && !isDescendant(f, folder.id)) {
        // Add to dropdown
    }
}
```

### Public Library Implementation

**Folder View with Subfolders (`library.html`):**

When viewing a folder, the left sidebar displays:

```
📂 Sub-folders
  [Subfolder 1] → (5 items)
  [Subfolder 2] → (3 items)

📄 Content Items
  [Content Item 1]
  [Content Item 2]
```

**Key Code:**
```javascript
// Get subfolders for current folder
const subfolders = library.folders.filter(f => f.parentId === currentFolder.id);

// Display subfolders section
if (subfolders.length > 0) {
    html += '<h3>📂 Sub-folders</h3>';
    subfolders.forEach(subfolder => {
        html += `
            <div class="subfolder-card" onclick="window.location.href='?folder=${subfolder.slug}'">
                📂 ${subfolder.title} (${subfolder.actualItemCount} items)
            </div>
        `;
    });
}
```

### Scrollable Folder Sections

**CSS Implementation (`admin-styles.css`):**

```css
.folders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 20px;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 8px;
}

/* Custom scrollbar styling */
.folders-grid::-webkit-scrollbar {
    width: 8px;
}

.folders-grid::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.folders-grid::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 4px;
}

.folders-grid::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.7);
}
```

**Benefits:**
- Shows first row of 4 folders by default
- Scroll to see more folders
- No limit on number of folders
- Smooth purple-themed scrollbar

### Database Schema

**`folders` Table:**
- `parent_id` (UUID) - References parent folder (NULL for root)
- `folder_type` (TEXT) - "root" or "sub_root"
- `depth` (INTEGER) - Nesting level (0 for root, 1+for subfolders)

**Recursive Queries:**
```sql
-- Get all descendants of a folder
WITH RECURSIVE folder_tree AS (
    SELECT id, parent_id, title, 0 as depth
    FROM folders
    WHERE id = $1
    
    UNION ALL
    
    SELECT f.id, f.parent_id, f.title, ft.depth + 1
    FROM folders f
    INNER JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree;
```

---

## Presentation Viewer System

### Overview
**Version:** 3.0 (January 28, 2026)

Complete presentation viewer system cloned from flipbook viewer with dedicated branding and functionality.

### Content Type: Presentation Slides

**Admin Panel:**
- New content type option: "Presentation Slides"
- Displays with 📊 icon (vs 📖 for flipbooks)
- Same JSON manifest format as flipbooks
- Uses same Supabase table (`project_pdf`)
- Uses same Cloudflare R2 storage

### File Structure

```
3c-content-library/
├── presentation-viewer.html           # Desktop presentation viewer
├── presentation-viewer.js             # Desktop viewer logic
├── presentation-viewer-mobile.html    # Mobile presentation viewer
├── presentation-viewer-mobile.js      # Mobile viewer logic
│
├── flipbook-viewer.html              # Desktop flipbook viewer
├── flipbook-viewer.js                # Desktop viewer logic
├── flipbook-viewer-mobile.html       # Mobile flipbook viewer
├── flipbook-viewer-mobile.js         # Mobile viewer logic
│
├── worker-api.js                     # Shared Cloudflare R2 worker
├── wrangler.toml                     # Shared Cloudflare config
└── config.js                         # Shared Supabase config
```

### Presentation Viewer Features

**Desktop Viewer (`presentation-viewer.html`):**
- PDF.js rendering at 2x quality
- Turn.js page-turning effects
- Interactive hotspots and buttons
- Video popup overlays
- Zoom controls
- Page navigation
- Download as PDF
- Full-screen mode
- Mobile device detection → redirects to mobile viewer

**Mobile Viewer (`presentation-viewer-mobile.html`):**
- Single-page view optimized for mobile
- Swipe navigation (Hammer.js)
- Pinch-to-zoom
- Touch-optimized controls
- Responsive layout
- Same interactive features as desktop

### Public/Private Library Integration

**Display Logic (`library.html` & `private-library.html`):**

```javascript
if (content.type === 'presentation') {
    // Show thumbnail with presentation icon
    const thumbnailSrc = content.thumbnail || 'data:image/svg+xml,...📊...';
    const presentationUrl = content.url 
        ? `presentation-viewer.html?manifest=${encodeURIComponent(content.url)}` 
        : `presentation-viewer.html?content=${content.id}`;
    
    viewerHtml = `
        <div style="text-align: center;">
            <img src="${thumbnailSrc}" style="...">
            <a href="${presentationUrl}" target="_blank" style="...">
                <span style="font-size: 24px;">📊</span>
                Click to View Presentation
            </a>
        </div>
    `;
}
```

**Admin Panel Display (`admin-core.js`):**

```javascript
// Presentation icon in type icon function
function getTypeIcon(type) {
    const icons = {
        pdf: '📄',
        flipbook: '📖',
        presentation: '📊',  // NEW
        video: '🎥',
        image: '🖼️',
        audio: '🎵',
        link: '🔗'
    };
    return icons[type] || '📎';
}

// Display presentation with view link
if (content.type === 'presentation' && content.url) {
    viewLink = `
        <div class="content-meta">
            <a href="presentation-viewer.html?manifest=${encodeURIComponent(content.url)}" 
               target="_blank" style="...">
                <span style="font-size: 18px;">📊</span>
                Click to view presentation
            </a>
        </div>
    `;
}
```

### Shared Infrastructure

**Cloudflare R2 Storage:**
- Same R2 bucket: `3c-library-files`
- Same worker: `worker-api.js`
- Same configuration: `wrangler.toml`
- Same public URL: `https://files.3c-public-library.org`

**Supabase Integration:**
- Same table: `project_pdf` (stores both flipbooks and presentations)
- Same configuration: `config.js`
- Same client: `supabase-client.js`
- Differentiated by `presentationMode` flag in JSON

**3C Buttons & Assets:**
- Loaded from manifest URLs
- Stored in R2 bucket
- Same assets used by both flipbook and presentation
- No separate directory needed

### URL Patterns

**Desktop Presentation:**
```
https://3c-public-library.org/presentation-viewer.html?manifest=<r2_url>
https://3c-public-library.org/presentation-viewer.html?content=<content_id>
```

**Mobile Presentation:**
```
https://3c-public-library.org/presentation-viewer-mobile.html?manifest=<r2_url>
https://3c-public-library.org/presentation-viewer-mobile.html?content=<content_id>
```

### Mobile Redirect Logic

**Desktop Viewer (`presentation-viewer.js`):**
```javascript
function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

async function init() {
    if (isMobileDevice()) {
        console.log('📱 Mobile device detected, redirecting to mobile viewer...');
        const params = new URLSearchParams(window.location.search);
        window.location.href = 'presentation-viewer-mobile.html?' + params.toString();
        return;
    }
    
    console.log('🖥️ Desktop device detected, loading desktop presentation...');
    // Load presentation...
}
```

---

## Interactive PDF Integration

### Overview

The **Interactive PDF** project (separate repository) integrates with the 3C Content Library through JSON manifests and the new **Presentation Mode** toggle.

### Presentation Mode Toggle

**Location:** `interactive-pdf FINAL/public/index.html` & `app.js`

**UI Component:**
```html
<!-- Presentation Mode Toggle -->
<div class="mb-3 bg-gradient-to-r from-orange-100 to-red-100 rounded p-2 border-2 border-orange-300">
    <label class="flex items-center justify-between text-xs">
        <span class="font-medium text-gray-900">
            <i class="fas fa-presentation mr-1"></i>Presentation Mode
        </span>
        <div class="flex items-center space-x-2">
            <span class="text-xs text-gray-900">Off</span>
            <label class="relative inline-block w-10 h-5">
                <input type="checkbox" id="presentationMode" class="sr-only" onchange="togglePresentationMode()">
                <div class="block bg-gray-400 w-10 h-5 rounded-full"></div>
                <div class="dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition"></div>
            </label>
            <span class="text-xs text-gray-900">On</span>
        </div>
    </label>
    <p class="text-xs text-gray-900 mt-1">
        <span id="presentationDescription">📊 Enable to save as presentation instead of flipbook</span>
    </p>
</div>
```

**JavaScript Implementation (`app.js`):**

```javascript
// Global state
let presentationMode = false; // Default: OFF (saves as flipbook)

// Toggle function
function togglePresentationMode() {
    presentationMode = document.getElementById('presentationMode')?.checked || false;
    const description = document.getElementById('presentationDescription');
    
    if (presentationMode) {
        description.textContent = '📊 Presentation mode ON - Will save as PRESENTATION type';
        description.classList.add('text-orange-700', 'font-semibold');
        showStatus('📊 Presentation mode enabled: JSON will be saved as presentation type!', 'success');
    } else {
        description.textContent = '📊 Enable to save as presentation instead of flipbook';
        description.classList.remove('text-orange-700', 'font-semibold');
        showStatus('📖 Flipbook type: JSON will be saved as flipbook type', 'info');
    }
}

// Save in project settings
const projectData = {
    pages: pages,
    assets: assets,
    settings: {
        title: title,
        author: author,
        flipbookMode: flipbookMode,
        presentationMode: presentationMode,  // NEW
        folderName: folderName,
        subfolderName: subfolderName,
        // ...
    }
};
```

### Workflow: Creating Presentations

**Step 1: Interactive PDF Editor**
1. Open interactive-pdf editor
2. Create presentation pages with interactive elements
3. Toggle **"Presentation Mode"** ON (orange toggle)
4. Toggle **"Magazine Flipbook"** ON (for page-turning effect)
5. Set **Folder Name** and **Subfolder Name** (optional)
6. Save/Export as JSON

**Step 2: JSON Manifest**
```json
{
    "id": "project-123",
    "title": "My Presentation",
    "pages": [...],
    "assets": [...],
    "settings": {
        "flipbookMode": true,
        "presentationMode": true,  // Identifies as presentation
        "folderName": "courses",
        "subfolderName": "level-1"
    }
}
```

**Step 3: Upload to 3C Content Library**
1. Open admin panel (`admin.html`)
2. Select folder (supports nested subfolders)
3. Click "Add PDF/Flipbook"
4. Select **"Presentation Slides"** as Content Type
5. Upload JSON file (auto-uploads to Cloudflare R2)
6. Set title, description, thumbnail
7. Save to Supabase

**Step 4: Public Display**
1. Presentation appears in library with 📊 icon
2. "Click to View Presentation" button
3. Opens `presentation-viewer.html` (desktop) or `presentation-viewer-mobile.html` (mobile)
4. Full interactive experience with page-turning, videos, hotspots

### Folder/Subfolder Integration

**Interactive PDF saves folder structure:**
```javascript
settings: {
    folderName: "courses",      // Main category
    subfolderName: "level-1"    // Subcategory
}
```

**3C Content Library uses:**
- Admin panel: Select folder from hierarchical dropdown
- Supabase: Stores in `content_public.folder_id`
- Public library: Displays in correct folder/subfolder

**Path Preview in Interactive PDF:**
```
📁 Save path: /interactive/2026/flipbook/courses/level-1/my-presentation-v1.0.pdf
```

### Default Settings

**Flipbook Mode:** ON by default (magazine-style page turning)  
**Presentation Mode:** OFF by default (saves as flipbook unless toggled)

**Why Both Toggles?**
- **Flipbook Mode** = Page-turning effect (ON/OFF)
- **Presentation Mode** = Content type identifier (Flipbook vs Presentation)

**Example Combinations:**
1. Flipbook Mode ON + Presentation Mode OFF = **Flipbook** with page-turning
2. Flipbook Mode ON + Presentation Mode ON = **Presentation** with page-turning
3. Flipbook Mode OFF + Presentation Mode OFF = **Flipbook** without page-turning
4. Flipbook Mode OFF + Presentation Mode ON = **Presentation** without page-turning

---

## Version History

**v3.0** (January 28, 2026)
- ✨ Added unlimited nested subfolder support
- ✨ Added complete presentation viewer system (desktop + mobile)
- ✨ Added presentation mode toggle in interactive-pdf
- ✨ Added scrollable folder sections (max-height 400px)
- ✨ Added presentation slides content type
- 🔧 Updated admin panel with hierarchical folder display
- 🔧 Updated public/private libraries to show subfolders
- 🔧 Integrated presentation viewer with Cloudflare R2 and Supabase
- 📚 Comprehensive architecture documentation update

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
- `IMPLEMENTATION-SUMMARY.md` - Latest feature implementation details
- GitHub Issues - Bug reports

---

**End of Architecture Documentation**
