# 🗺️ URL Structure Diagram

## 📊 Visual Hierarchy

```
3C Content Library
│
├── 📁 Root Folder: "Aurion - Goal Setting"
│   │   URL: aurion_goal
│   │
│   ├── 📄 Content 1: "Introduction"
│   │   URL: aurion_goal_content.01
│   │
│   ├── 📄 Content 2: "Getting Started"
│   │   URL: aurion_goal_content.02
│   │
│   ├── 📂 Sub-Root: "Aurion Reports"
│   │   │   URL: aurion_goal_sub.01
│   │   │
│   │   ├── 📄 Content 1: "Q4 Report"
│   │   │   URL: aurion_goal_sub.01_content.01
│   │   │
│   │   └── 📄 Content 2: "Annual Summary"
│   │       URL: aurion_goal_sub.01_content.02
│   │
│   └── 📂 Sub-Root: "Aurion Templates"
│       │   URL: aurion_goal_sub.02
│       │
│       ├── 📄 Content 1: "Template A"
│       │   URL: aurion_goal_sub.02_content.01
│       │
│       └── 📄 Content 2: "Template B"
│           URL: aurion_goal_sub.02_content.02
│
└── 📁 Root Folder: "Anica - Coffee Break Chats"
    │   URL: anica_chats
    │
    ├── 📄 Content 1: "Episode 1"
    │   URL: anica_chats_content.01
    │
    └── 📂 Sub-Root: "Anica Highlights"
        │   URL: anica_chats_sub.01
        │
        └── 📄 Content 1: "Best Moments"
            URL: anica_chats_sub.01_content.01
```

---

## 🔗 URL Examples

### Folder URLs:

#### Root Folders:
```
https://3c-content-library.vercel.app/library.html?folder=aurion_goal
https://3c-content-library.vercel.app/library.html?folder=anica_chats
https://3c-content-library.vercel.app/library.html?folder=tutorials
```

#### Sub-Root Folders:
```
https://3c-content-library.vercel.app/library.html?folder=aurion_goal_sub.01
https://3c-content-library.vercel.app/library.html?folder=aurion_goal_sub.02
https://3c-content-library.vercel.app/library.html?folder=anica_chats_sub.01
```

### Content URLs:

#### In Root Folder:
```
https://3c-content-library.vercel.app/library.html?folder=aurion_goal&content=aurion_goal_content.01
https://3c-content-library.vercel.app/library.html?folder=aurion_goal&content=aurion_goal_content.02
```

#### In Sub-Root Folder:
```
https://3c-content-library.vercel.app/library.html?folder=aurion_goal_sub.01&content=aurion_goal_sub.01_content.01
https://3c-content-library.vercel.app/library.html?folder=aurion_goal_sub.01&content=aurion_goal_sub.01_content.02
```

#### PDF-Only Mode:
```
https://3c-content-library.vercel.app/library.html?content=aurion_goal_sub.01_content.01&view=pdf-only
https://3c-content-library.vercel.app/library.html?content=anica_chats_content.01&view=pdf-only
```

---

## 🎨 URL Patterns

### Pattern 1: Root Folder
```
Format: {folder_name}
Example: aurion_goal
```

### Pattern 2: Sub-Root Folder
```
Format: {parent_folder}_sub.{number}
Example: aurion_goal_sub.01
```

### Pattern 3: Content in Root
```
Format: {folder_name}_content.{number}
Example: aurion_goal_content.01
```

### Pattern 4: Content in Sub-Root
```
Format: {parent_folder}_sub.{number}_content.{number}
Example: aurion_goal_sub.01_content.01
```

---

## 📋 Naming Convention

### Root Folders:
- Use descriptive names
- Replace spaces with underscores
- Keep lowercase
- Examples:
  - `aurion_goal`
  - `anica_chats`
  - `tutorial_series`
  - `reference_docs`

### Sub-Root Folders:
- Auto-numbered: `.01`, `.02`, `.03`
- Inherits parent name
- Examples:
  - `aurion_goal_sub.01`
  - `aurion_goal_sub.02`
  - `anica_chats_sub.01`

### Content:
- Auto-numbered: `.01`, `.02`, `.03`
- Inherits folder name
- Examples:
  - `aurion_goal_content.01`
  - `aurion_goal_sub.01_content.01`

---

## 🔄 URL Flow Diagram

```
User Action                 URL Generated
───────────────────────────────────────────────────

Create Root Folder
"Aurion - Goal Setting"  →  aurion_goal
                             
Create Sub-Root Folder
"Aurion Reports"         →  aurion_goal_sub.01
(under Aurion)

Upload PDF to Root
"Introduction.pdf"       →  aurion_goal_content.01

Upload PDF to Sub-Root
"Q4 Report.pdf"          →  aurion_goal_sub.01_content.01

Share Folder Link        →  ?folder=aurion_goal

Share Content Link       →  ?folder=aurion_goal&content=aurion_goal_content.01

Share PDF-Only Link      →  ?content=aurion_goal_content.01&view=pdf-only
```

---

## 🎯 URL Decision Tree

```
Starting Point: Need to create URL
│
├─ Is it a Folder?
│  │
│  ├─ Yes → Is it top-level?
│  │  │
│  │  ├─ Yes → ROOT FOLDER
│  │  │        Format: {name}
│  │  │        Example: aurion_goal
│  │  │
│  │  └─ No → SUB-ROOT FOLDER
│  │           Format: {parent}_sub.{number}
│  │           Example: aurion_goal_sub.01
│  │
│  └─ No → Is it Content?
│     │
│     └─ Yes → In which folder?
│        │
│        ├─ Root Folder → CONTENT IN ROOT
│        │                Format: {folder}_content.{number}
│        │                Example: aurion_goal_content.01
│        │
│        └─ Sub-Root → CONTENT IN SUB-ROOT
│                      Format: {parent}_sub.{number}_content.{number}
│                      Example: aurion_goal_sub.01_content.01
```

---

## 📊 URL Comparison Table

| Type | Old (UUID) | New (Slug) | Length |
|------|-----------|------------|--------|
| Root Folder | `?folder=73f33dec-91dc-45fc-bebe-63c17f75332d` | `?folder=aurion_goal` | 80% shorter |
| Sub-Root | `?folder=b57f3789-7003-4e31-a9d6-9c49bcd569dd` | `?folder=aurion_goal_sub.01` | 75% shorter |
| Content | `?content=a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `?content=aurion_goal_content.01` | 70% shorter |
| PDF-Only | N/A | `?content=aurion_goal_content.01&view=pdf-only` | New feature! |

---

## 🎨 Visual URL Builder

### Step 1: Choose Folder Type
```
[ ] Root Folder     → {name}
[ ] Sub-Root Folder → {parent}_sub.{number}
```

### Step 2: Enter Name
```
Input: Aurion - Goal Setting
Clean: aurion_goal
```

### Step 3: Select Parent (if Sub-Root)
```
Parent: aurion_goal
Result: aurion_goal_sub.01
```

### Step 4: Add Content
```
Folder: aurion_goal_sub.01
Content: Q4 Report
Result: aurion_goal_sub.01_content.01
```

### Step 5: Generate Share Link
```
Folder View:  ?folder=aurion_goal_sub.01
Content View: ?folder=aurion_goal_sub.01&content=aurion_goal_sub.01_content.01
PDF-Only:     ?content=aurion_goal_sub.01_content.01&view=pdf-only
```

---

## 🔍 URL Lookup Flow

```
User enters URL: ?folder=aurion_goal_sub.01
                 │
                 ├─ Check cache (5-min)
                 │  │
                 │  ├─ Found → Return cached data ⚡
                 │  │
                 │  └─ Not found → Query database
                 │                 │
                 │                 ├─ Try custom_url
                 │                 │  │
                 │                 │  ├─ Found → Return folder ✅
                 │                 │  │
                 │                 │  └─ Not found → Try slug
                 │                 │                 │
                 │                 │                 ├─ Found → Return folder ✅
                 │                 │                 │
                 │                 │                 └─ Not found → Try UUID fallback
                 │                 │                                │
                 │                 │                                ├─ Found → Return folder ✅
                 │                 │                                │
                 │                 │                                └─ Not found → Error 404 ❌
                 │
                 └─ Cache result for 5 minutes
```

---

## 🎯 Real-World Examples

### Example 1: Aurion Goal Setting System
```
Root:     aurion_goal
Sub 1:    aurion_goal_sub.01  (Reports)
Sub 2:    aurion_goal_sub.02  (Templates)
Content:  aurion_goal_sub.01_content.01  (Q4 Report)
```

### Example 2: Anica Coffee Break Chats
```
Root:     anica_chats
Sub 1:    anica_chats_sub.01  (Highlights)
Content:  anica_chats_content.01  (Episode 1)
```

### Example 3: Tutorial Series
```
Root:     tutorials
Sub 1:    tutorials_sub.01  (Beginner)
Sub 2:    tutorials_sub.02  (Advanced)
Content:  tutorials_sub.01_content.01  (Getting Started)
```

---

## 📝 Quick Reference

### Creating URLs:
1. **Root Folder**: Just the name (`aurion_goal`)
2. **Sub-Root**: Parent + `_sub.01` (`aurion_goal_sub.01`)
3. **Content**: Folder + `_content.01` (`aurion_goal_content.01`)

### Sharing URLs:
1. **Folder**: `?folder={slug}`
2. **Content**: `?folder={folder_slug}&content={content_slug}`
3. **PDF-Only**: `?content={content_slug}&view=pdf-only`

### Best Practices:
- ✅ Use underscores for spaces
- ✅ Keep lowercase
- ✅ Let system auto-number
- ✅ Use descriptive names
- ❌ Don't use special characters
- ❌ Don't use spaces

---

*This diagram shows the complete URL structure for the 3C Content Library system.*
