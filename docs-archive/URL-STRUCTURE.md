# 🔗 URL Structure Guide

## Overview

Your 3C Library now has proper URL slugs for both folders and content!

---

## 📁 Folder URLs

### Format
```
Folder Title → Folder Slug
```

### Examples

| Folder Title | Table Name | Folder Slug |
|-------------|------------|-------------|
| Anica Coffee Break Chats | `anica_chats` | `anica-coffee-break-chats` |
| Premium Course | `premium_course` | `premium-course` |
| Getting Started | `intro` | `getting-started` |

### Duplicate Handling
If you create another folder with the same title:

```
First:  "Anica Coffee Break Chats" → anica-coffee-break-chats
Second: "Anica Coffee Break Chats" → anica-coffee-break-chats-02
Third:  "Anica Coffee Break Chats" → anica-coffee-break-chats-03
```

**Note:** First folder has NO number, duplicates start at -02

---

## 📄 Content URLs

### Format
```
Table Name + Sequential Number → Content Slug
```

### Examples

**Folder:** "Anica Coffee Break Chats"  
**Table Name:** `anica_chats`  
**Content Slugs:**

| Content Title | Content Slug |
|--------------|--------------|
| Episode 1 | `anica-chats-01` |
| Episode 2 | `anica-chats-02` |
| Q&A Session | `anica-chats-03` |
| Special Guest | `anica-chats-04` |

**Key Points:**
- Uses **table_name** (not full folder slug)
- Always has a number (starts at -01)
- Sequential within each folder
- Converts underscores to hyphens

---

## 🌐 Full URL Examples

### Public Library URLs

**Base URL:** `https://3c-content-library.vercel.app`

**View all folders:**
```
https://3c-content-library.vercel.app/library.html
```

**View specific folder:**
```
https://3c-content-library.vercel.app/library.html?folder=anica-coffee-break-chats
```

**View specific content:**
```
https://3c-content-library.vercel.app/library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

### Admin Panel URLs

**Admin dashboard:**
```
https://3c-content-library.vercel.app/admin.html
```

---

## 🔧 How It Works

### When You Create a Folder:

1. **Input:**
   - Title: "Anica Coffee Break Chats"
   - Table Name: "anica_chats"
   - Visibility: Public

2. **System Generates:**
   - Slug: `anica-coffee-break-chats`
   - Stored in `folders` table

3. **Database:**
```sql
INSERT INTO folders (title, slug, table_name, is_public)
VALUES ('Anica Coffee Break Chats', 'anica-coffee-break-chats', 'anica_chats', true);
```

### When You Add Content:

1. **Input:**
   - Folder: "Anica Coffee Break Chats" (slug: anica-coffee-break-chats)
   - Title: "Episode 1"
   - Type: PDF

2. **System Generates:**
   - Slug: `anica-chats-01` (from table_name: anica_chats)
   - Next content: `anica-chats-02`, `anica-chats-03`, etc.

3. **Database:**
```sql
INSERT INTO content_public (folder_id, slug, table_name, title, type)
VALUES (
  'folder-uuid-here',
  'anica-chats-01',
  'anica_chats',
  'Episode 1',
  'pdf'
);
```

---

## 📊 URL Structure Comparison

### Before (UUID-based):
```
❌ library.html?folder=a1b2c3d4-e5f6-7890-abcd-ef1234567890&content=x9y8z7w6-v5u4-3210-9876-543210fedcba
```

### After (Slug-based):
```
✅ library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

**Benefits:**
- ✅ Human-readable
- ✅ SEO-friendly
- ✅ Easy to share
- ✅ Memorable
- ✅ Professional

---

## 🎯 Naming Best Practices

### Folder Titles
```
✅ Good:
- "Anica Coffee Break Chats"
- "Premium Course 2024"
- "Getting Started Guide"

❌ Avoid:
- "Folder 1" (not descriptive)
- "Test" (too generic)
- "anica-coffee-break-chats" (use proper title case)
```

### Table Names
```
✅ Good:
- anica_chats
- premium_course
- getting_started
- tutorials_2024

❌ Bad:
- Anica_Chats (uppercase)
- anica-chats (hyphens not allowed)
- anica chats (spaces not allowed)
- AnicaChats (no underscores)
```

**Rules:**
- Lowercase only
- Underscores for spaces
- Letters and numbers only
- No special characters
- Keep it short but descriptive

---

## 🔍 Finding Content by Slug

### In Supabase SQL:

**Find folder by slug:**
```sql
SELECT * FROM folders WHERE slug = 'anica-coffee-break-chats';
```

**Find content by slug:**
```sql
SELECT * FROM content_public WHERE slug = 'anica-chats-01';
```

**Get all content in a folder:**
```sql
SELECT c.* 
FROM content_public c
JOIN folders f ON c.folder_id = f.id
WHERE f.slug = 'anica-coffee-break-chats'
ORDER BY c.display_order;
```

---

## 📱 URL Routing (Future Enhancement)

### Current Structure:
```
library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

### Potential Future Structure:
```
/library/anica-coffee-break-chats/anica-chats-01
```

This would require:
- URL rewriting (Vercel config)
- Or a framework like Next.js
- Or custom routing logic

**For now:** Query parameters work perfectly!

---

## 🛠️ Troubleshooting

### Slug Not Generated?

**Check:**
1. Did you run the updated `supabase-schema.sql`?
2. Does the `generate_slug()` function exist?
3. Does the `generate_content_slug()` function exist?

**Verify:**
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name IN ('generate_slug', 'generate_content_slug');
```

### Duplicate Slugs?

**Shouldn't happen!** The functions check for duplicates.

**If it does:**
```sql
-- Find duplicate folder slugs
SELECT slug, COUNT(*) 
FROM folders 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Find duplicate content slugs
SELECT slug, COUNT(*) 
FROM content_public 
GROUP BY slug 
HAVING COUNT(*) > 1;
```

### Slug Format Wrong?

**Check table_name:**
```sql
SELECT title, slug, table_name FROM folders;
```

Make sure `table_name` uses underscores (e.g., `anica_chats`), not hyphens.

---

## 📋 Migration for Existing Data

If you already have content without slugs:

### Update Folder Slugs:
```sql
-- Regenerate all folder slugs
UPDATE folders 
SET slug = generate_slug(title)
WHERE slug IS NULL OR slug = '';
```

### Update Content Slugs:
```sql
-- For public content
UPDATE content_public c
SET slug = generate_content_slug(c.title, c.folder_id, c.table_name)
WHERE slug IS NULL OR slug = '';

-- For private content
UPDATE content_private c
SET slug = generate_content_slug(c.title, c.folder_id, c.table_name)
WHERE slug IS NULL OR slug = '';
```

---

## 🎨 Display Examples

### In Admin Panel:

**Folder List:**
```
📁 Anica Coffee Break Chats
   Slug: anica-coffee-break-chats
   Table: anica_chats
   Items: 5
```

**Content List:**
```
📄 Episode 1
   Slug: anica-chats-01
   Folder: Anica Coffee Break Chats
   Type: PDF
```

### In Public Library:

**Browser Address Bar:**
```
https://3c-content-library.vercel.app/library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

**Share Link:**
```
Copy this link: 
https://3c-content-library.vercel.app/library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

---

## 🚀 Benefits of This Structure

### For You (Admin):
- ✅ Easy to identify content
- ✅ Organized by table_name
- ✅ Sequential numbering
- ✅ No confusion between folders and content

### For Users:
- ✅ Readable URLs
- ✅ Easy to share
- ✅ Bookmarkable
- ✅ Professional appearance

### For SEO:
- ✅ Descriptive URLs
- ✅ Keyword-rich
- ✅ Search engine friendly
- ✅ Better indexing

---

## 📝 Summary

### Folder URLs:
```
Title: "Anica Coffee Break Chats"
Slug:  anica-coffee-break-chats (no number)
URL:   ?folder=anica-coffee-break-chats
```

### Content URLs:
```
Table: anica_chats
Slug:  anica-chats-01, anica-chats-02, etc.
URL:   ?folder=anica-coffee-break-chats&content=anica-chats-01
```

### Key Differences:
- **Folders:** Use full title → slug (no number unless duplicate)
- **Content:** Use table_name → slug-01, slug-02, etc.
- **Separation:** Content slugs use table_name to avoid confusion with folder slugs

---

**Your URLs are now clean, professional, and SEO-friendly! 🎉**
