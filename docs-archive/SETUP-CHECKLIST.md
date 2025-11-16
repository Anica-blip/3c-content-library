# ✅ Setup Checklist - Track Your Progress

Use this checklist to track your setup progress. Check off each item as you complete it!

---

## 📋 Pre-Setup (Understanding)

- [ ] Read `START-HERE.md` (2 minutes)
- [ ] Understand the 4 main issues that were fixed
- [ ] Review `VISUAL-GUIDE.md` to see how everything connects

---

## 🗄️ Step 1: Database Setup (2 minutes)

- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Open `add-subfolder-support.sql` file
- [ ] Copy all SQL code
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run" button
- [ ] Verify no errors
- [ ] ✅ Sub-folder support enabled!

**Test**: Run this query to verify:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'folders' AND column_name IN ('parent_id', 'depth', 'path');
```
Should return 3 rows.

---

## ☁️ Step 2: Cloudflare R2 Bucket (5 minutes)

- [ ] Log in to Cloudflare Dashboard
- [ ] Click "R2" in left sidebar
- [ ] Click "Create bucket"
- [ ] Name: `3c-library-files`
- [ ] Choose location (or leave default)
- [ ] Click "Create bucket"
- [ ] Go to bucket Settings
- [ ] Scroll to "Public access"
- [ ] Click "Allow Access"
- [ ] Copy the public URL (looks like: `https://pub-xxxxx.r2.dev`)
- [ ] Save this URL somewhere safe!

**Your R2 Public URL**: `_______________________________`

---

## 🔧 Step 3: Cloudflare Worker Setup (5 minutes)

### 3.1 Create Worker
- [ ] In Cloudflare Dashboard, click "Workers & Pages"
- [ ] Click "Create application"
- [ ] Click "Create Worker"
- [ ] Name: `3c-library-upload`
- [ ] Click "Deploy"

### 3.2 Connect to GitHub
- [ ] Click "Settings" tab in worker
- [ ] Scroll to "Build configuration"
- [ ] Click "Connect to Git"
- [ ] Select repository: `personal-website-2`
- [ ] Root directory: `Dashboard-library`
- [ ] Click "Save"

### 3.3 Bind R2 Bucket
- [ ] Still in Settings, scroll to "Variables and Secrets"
- [ ] Click "R2 Bucket Bindings"
- [ ] Click "Add binding"
- [ ] Variable name: `R2_BUCKET`
- [ ] R2 bucket: Select `3c-library-files`
- [ ] Click "Save"

### 3.4 Add Environment Variable
- [ ] Click "Environment Variables"
- [ ] Click "Add variable"
- [ ] Variable name: `R2_PUBLIC_URL`
- [ ] Value: (paste your R2 public URL from Step 2)
- [ ] Click "Save"

### 3.5 Get Worker URL
- [ ] Copy your worker URL (looks like: `https://3c-library-upload.YOUR-SUBDOMAIN.workers.dev`)
- [ ] Save this URL somewhere safe!

**Your Worker URL**: `_______________________________`

---

## ⚙️ Step 4: Update Config File (2 minutes)

- [ ] Open `Dashboard-library/config.js`
- [ ] Find the `r2:` section
- [ ] Update `publicUrl` with your R2 public URL
- [ ] Update `uploadEndpoint` with your worker URL + `/upload`
- [ ] Save the file

**Example**:
```javascript
r2: {
    publicUrl: 'https://pub-xxxxx.r2.dev',  // ← Your R2 URL
    uploadEndpoint: 'https://3c-library-upload.YOUR-SUBDOMAIN.workers.dev/upload',  // ← Your worker URL
    // ... rest stays the same
}
```

---

## 🚀 Step 5: Deploy to GitHub (1 minute)

- [ ] Open terminal in `Dashboard-library` folder
- [ ] Run: `git add .`
- [ ] Run: `git commit -m "Add Cloudflare Worker and sub-folder support"`
- [ ] Run: `git push origin main`
- [ ] Wait for Cloudflare to auto-deploy (check Workers dashboard)
- [ ] Wait for Vercel to auto-deploy (check Vercel dashboard)

---

## 🧪 Step 6: Test Everything (5 minutes)

### 6.1 Test Admin Panel
- [ ] Open your admin panel URL
- [ ] Enter Supabase credentials (if needed)
- [ ] Click "Connect"
- [ ] Verify connection successful

### 6.2 Test Root Folder Creation
- [ ] Scroll to "Create New Folder"
- [ ] Parent Folder: Leave as "-- Root Folder --"
- [ ] Title: `Test Folder`
- [ ] Table Name: `test`
- [ ] Visibility: `Public`
- [ ] Click "Create Folder"
- [ ] Verify folder appears in "Manage Folders" section

### 6.3 Test Sub-Folder Creation
- [ ] Scroll to "Create New Folder"
- [ ] Parent Folder: Select "Test Folder"
- [ ] Title: `Sub Folder 1`
- [ ] Table Name: `test`
- [ ] Visibility: `Public`
- [ ] Click "Create Folder"
- [ ] Verify sub-folder appears indented under parent

### 6.4 Test File Upload
- [ ] Scroll to "Add Content"
- [ ] Select Folder: Choose "Test Folder" or "Sub Folder 1"
- [ ] Title: `Test PDF`
- [ ] Type: `PDF Document`
- [ ] Click "Choose File" and select a small PDF
- [ ] Click "Save Content"
- [ ] Verify upload successful
- [ ] Check "Manage Content" section
- [ ] Verify URL is displayed (📄 File URL: https://...)

### 6.5 Test Library Display
- [ ] Open library.html in browser
- [ ] Verify folders appear in sidebar
- [ ] Verify content appears in main area
- [ ] Click on a folder
- [ ] Verify content for that folder displays
- [ ] Click on a PDF
- [ ] Verify PDF opens in viewer

---

## ✅ Final Verification

- [ ] Admin panel connects to Supabase
- [ ] Can create root folders
- [ ] Can create sub-folders (with parent selection)
- [ ] Sub-folders show with indentation
- [ ] Can upload files
- [ ] File URLs display in admin
- [ ] Library.html shows folders
- [ ] Library.html shows content
- [ ] Can open PDFs in library
- [ ] Everything works end-to-end!

---

## 🎉 Success Criteria

You're done when:
- ✅ Database has sub-folder columns
- ✅ R2 bucket is created and public
- ✅ Worker is deployed and bound to R2
- ✅ Config.js has correct URLs
- ✅ Can create folders and sub-folders
- ✅ Can upload files
- ✅ URLs show in admin
- ✅ Library displays everything

---

## 📝 Important URLs to Save

Write these down for future reference:

| Service | URL | Notes |
|---------|-----|-------|
| Supabase URL | `https://cgxjqsbrditbteqhdyus.supabase.co` | Your database |
| R2 Public URL | `_______________________________` | File storage |
| Worker URL | `_______________________________` | Upload API |
| Admin Panel | `_______________________________` | Your admin |
| Public Library | `_______________________________` | Public view |

---

## 🆘 If Something Doesn't Work

### Database issues?
→ Check `add-subfolder-support.sql` ran without errors
→ Verify columns exist with test query above

### Upload failing?
→ Check R2 bucket exists
→ Verify bucket binding in worker
→ Check R2_PUBLIC_URL environment variable
→ Look at worker logs in Cloudflare

### Library empty?
→ Check browser console (F12)
→ Verify Supabase connection
→ Check config.js has correct credentials
→ Make sure you have data in Supabase

### Sub-folders not showing?
→ Verify SQL migration ran
→ Check if parent_id column exists
→ Refresh admin panel
→ Clear browser cache

---

## 📚 Documentation Reference

- **Quick Start**: `START-HERE.md`
- **Detailed Setup**: `CLOUDFLARE-GITHUB-SETUP.md`
- **All Fixes**: `FIXES-AND-IMPROVEMENTS.md`
- **Visual Guide**: `VISUAL-GUIDE.md`
- **Summary**: `SUMMARY.md`
- **SQL Migration**: `add-subfolder-support.sql`

---

## 🎯 Time Estimate

- Database Setup: 2 minutes
- R2 Bucket: 5 minutes
- Worker Setup: 5 minutes
- Config Update: 2 minutes
- Testing: 5 minutes

**Total: ~20 minutes**

---

**Good luck! Check off each item as you go!** ✅
