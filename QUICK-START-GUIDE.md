# 🚀 Quick Start Guide - URL Fixes

## ⚡ 3-Minute Setup

### Step 1: Run SQL Migration (1 minute)
1. Open Supabase → SQL Editor
2. Open file: `fix-urls-and-folders.sql`
3. Copy all content
4. Paste in SQL Editor
5. Click **Run**
6. ✅ Done!

### Step 2: Test in Admin Panel (1 minute)
1. Open admin panel
2. Create a test root folder:
   - **Folder Type**: Root Folder
   - **Title**: "Test Folder"
   - **Custom URL**: Leave empty (auto: `test-folder`)
   - **Table Name**: `test`
   - Click **Create Folder**
3. ✅ Check URL shows as `test-folder` (not UUID!)

### Step 3: Test in Public Library (1 minute)
1. Open library.html
2. Click the test folder
3. ✅ Check URL: `?folder=test-folder` (not UUID!)

---

## 📁 Creating Folders

### Root Folder (Top Level):
```
Folder Type: Root Folder
Title: Aurion - Goal Setting
Custom URL: aurion_goal (or leave empty)
Table Name: aurion_goal
```
**Result**: URL = `aurion_goal`

### Sub-Root Folder (Under Root):
```
Folder Type: Sub-Root Folder
Parent: Aurion - Goal Setting
Title: Aurion Reports
Custom URL: (leave empty for auto: aurion_goal_sub.01)
Table Name: aurion_reports
```
**Result**: URL = `aurion_goal_sub.01`

---

## 📄 Adding Content

```
Select Folder: Aurion - Goal Setting
Title: Q4 Report
Custom URL: (leave empty for auto)
Upload: your-file.pdf
```
**Result**: URL = `aurion_goal_content.01`

---

## 🔗 Sharing Links

### Share Folder (shows all PDFs):
```
https://3c-content-library.vercel.app/library.html?folder=aurion_goal
```

### Share PDF Only (no sidebar):
```
https://3c-content-library.vercel.app/library.html?content=aurion_goal_content.01&view=pdf-only
```

**Or**: Click "🔗 Copy PDF Link" button in viewer!

---

## ✅ What Changed

| Before | After |
|--------|-------|
| `?folder=73f33dec-91dc-45fc-bebe-63c17f75332d` | `?folder=aurion_goal` |
| `?content=b57f3789-7003-4e31-a9d6-9c49bcd569dd` | `?content=aurion_goal_content.01` |
| No folder types | Root + Sub-Root folders |
| Full Cloudflare URLs | Truncated with tooltip |
| Slow loading | 5-min cache = instant |
| PDF shows folder | PDF-only mode available |

---

## 🎯 Key Features

✅ **Custom URLs**: Set your own or auto-generate
✅ **Root/Sub-Root**: Two-level folder hierarchy
✅ **Fast Loading**: 5-minute cache
✅ **PDF-Only Mode**: Share without sidebar
✅ **Clean Display**: Truncated Cloudflare URLs
✅ **Auto-Suggestions**: Smart URL recommendations

---

## 🐛 Quick Fixes

**URLs still showing UUIDs?**
→ Run the SQL migration first!

**"Custom URL already exists"?**
→ Choose a different URL or leave empty for auto

**Folder not found?**
→ Refresh cache (wait 5 min or clear browser cache)

**Slow loading?**
→ Check browser console for errors

---

## 📞 Need Help?

1. Check `URL-FIXES-README.md` for full documentation
2. Open browser DevTools → Console for error messages
3. Verify SQL migration ran successfully in Supabase

---

**That's it! You're ready to go! 🎉**
