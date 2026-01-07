# 3C Flipbook System Documentation

**Version:** 2.0 | **Date:** January 7, 2026

## CRITICAL: DO NOT MODIFY WORKING FEATURES

This document defines COMPLETE and WORKING flipbook functionality. Changes risk code corruption.

---

## System Components

### Files
- `flipbook-viewer.html` - UI interface
- `flipbook-viewer.js` - Core logic (1,138 lines)
- Dependencies: jQuery, Turn.js, PDF.js, jsPDF, Supabase

### Constants (DO NOT CHANGE)
```javascript
const A4_WIDTH_PX = 794;      // A4 width at 96 DPI
const A4_HEIGHT_PX = 1123;    // A4 height at 96 DPI
const EDITOR_WIDTH_PX = 595;  // Editor canvas (75% of A4)
const EDITOR_HEIGHT_PX = 842; // Editor canvas (75% of A4)
let scale = 0.46;             // Default 46% zoom
```

---

## Element Types (COMPLETE)

1. **3C Button** - Custom image button with hover
2. **Regular Button** - Text button with colors
3. **Hotspot/Link** - Invisible clickable area
4. **Video** - Video with thumbnail or purple play box

---

## Video System (ALL FIXES APPLIED)

### Fix 1: Z-Index (Line 408)
- Changed from 10 to 1000
- Prevents Turn.js blocking clicks
- **Status:** COMPLETE

### Fix 2: Videos Without Thumbnails (Lines 616-646)
- Purple box with play icon
- Font Awesome icon, 48px
- **Status:** COMPLETE

### Fix 3: IIFE Closure (Lines 604-614, 635-645)
- Captures each element separately
- Fixes multiple video issue
- **Status:** COMPLETE

### Fix 4: Complete Cleanup (Lines 845-869)
- Stops media, clears iframes
- Removes Cloudflare Stream elements
- Resets all state
- **Status:** COMPLETE

### Fix 5: Orientation Detection (Lines 794-820)
- Auto-detects 16:9 (landscape) or 9:16 (portrait)
- Adjusts container dimensions
- **Status:** COMPLETE

---

## Coordinate Scaling (CRITICAL)

### Editor to Viewer Conversion
```javascript
// Editor saves at 595px x 842px
// Viewer displays at variable zoom
const scaleX = pageWidth / EDITOR_WIDTH_PX;
const scaleY = pageHeight / EDITOR_HEIGHT_PX;

const scaledX = element.x * scaleX;
const scaledY = element.y * scaleY;
const scaledWidth = element.width * scaleX;
const scaledHeight = element.height * scaleY;
```

### 2x Quality Rendering
```javascript
const renderScale = 2;
canvas.width = pageWidth * renderScale;
canvas.height = pageHeight * renderScale;
canvas.style.width = pageWidth + 'px';  // CSS scale
canvas.style.height = pageHeight + 'px';
```

---

## Manifest Format

```json
{
  "title": "Flipbook Title",
  "pages": [
    {
      "pageNumber": 1,
      "backgroundUrl": "https://...",
      "elements": [
        {
          "type": "video",
          "x": 300,
          "y": 400,
          "width": 200,
          "height": 150,
          "url": "https://video.mp4",
          "thumbnail": "https://thumb.jpg"
        }
      ]
    }
  ]
}
```

---

## Features

### Navigation
- First/Previous/Next/Last page buttons
- Page indicator
- Keyboard: Arrow keys, Home, End

### Zoom
- Zoom In/Out (5% increments)
- Range: 30% - 150%
- Re-renders at new scale

### Video Support
- Cloudflare Stream (native + iframe)
- YouTube/Vimeo (auto-embed)
- Direct video files (R2, external)
- Orientation detection

### Other
- Download as PDF
- Back to library
- Full-screen support

---

## URL Parameters

```
?manifest=<R2_URL>     # Load from Cloudflare R2
?content=<ID>          # Load from Supabase
```

---

## Integration with 3C Library

1. User uploads flipbook JSON to admin panel
2. Stored in `content_public.project_json`
3. Library displays as "Flipbook" type
4. Click opens: `flipbook-viewer.html?manifest=<url>`

---

## Known Working Features

- Page rendering with 2x quality
- Element positioning at all zoom levels
- Multiple videos on same page
- Video orientation detection (16:9 / 9:16)
- Complete video cleanup between plays
- Turn.js page flipping
- Zoom controls
- Download as PDF
- Keyboard navigation

---

## Potential Improvements

1. **Fullscreen Mode** - Add dedicated fullscreen button
2. **Page Thumbnails** - Sidebar with page previews
3. **Search** - Search text in flipbook
4. **Bookmarks** - Save favorite pages
5. **Share** - Share specific page URL
6. **Print** - Print specific pages
7. **Annotations** - User comments on pages
8. **Mobile Gestures** - Swipe to turn pages

---

## Troubleshooting

### Videos not clickable
- Check z-index is 1000 (not 10)
- Verify IIFE closure wraps click handler

### Videos wrong size
- Check orientation detection code
- Verify `onloadedmetadata` event fires

### Elements misaligned
- Verify EDITOR_WIDTH_PX = 595
- Check scaleX/scaleY calculations

### Poor image quality
- Verify renderScale = 2
- Check imageSmoothingQuality = 'high'

---

## Reference: VIDEO_FIXES.md

All fixes from `DOC/VIDEO_FIXES.md` have been applied:
1. Z-index: 1000
2. Purple box for videos without thumbnails
3. IIFE closure for multiple videos
4. Complete video cleanup
5. Video orientation detection

---

## Core Functions Reference

### init()
- Entry point
- Loads manifest from URL or Supabase
- Initializes viewer

### loadManifestFromUrl(url)
- Fetches JSON from Cloudflare R2
- Parses manifest data

### loadContentFromSupabase(id)
- Queries content_public/content_private
- Extracts project_json field

### renderPagesAtScale()
- Renders all pages at current zoom
- Uses 2x resolution for quality
- Creates canvas elements

### initFlipbook()
- Initializes Turn.js
- Sets up page turning
- Adds interactive elements

### renderInteractiveElements(pageDiv, elements, pageWidth, pageHeight)
- Filters positioned elements
- Scales coordinates from editor to viewer
- Creates clickable overlays

### playMedia(element, type)
- Opens video popup
- Handles all video sources
- Detects orientation

### closeMedia()
- Stops all media
- Clears iframes
- Resets overlay state

---

**END OF DOCUMENTATION**
