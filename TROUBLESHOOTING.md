# 🔧 Troubleshooting Guide

Quick solutions to common issues you might encounter.

---

## 🚨 Common Errors & Solutions

### Error: "CONFIG is not defined"
**Status:** ✅ FIXED  
**What was wrong:** Old config.js had deprecated tableName  
**Solution:** Already fixed in latest code. Clear browser cache and refresh.

```bash
# Clear cache:
Ctrl + Shift + Delete (Chrome/Edge)
Cmd + Shift + Delete (Mac)
# Or hard refresh:
Ctrl + F5 (Windows)
Cmd + Shift + R (Mac)
```

---

### Error: "relation 'public.folders_with_stats' does not exist"
**Cause:** Database schema not run or incomplete  
**Solution:**

1. Open Supabase SQL Editor
2. Run `supabase-schema.sql` completely
3. Verify with this query:

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_name = 'folders_with_stats';
```

If no results, the view wasn't created. Re-run the schema.

---

### Error: "Can't save folder" or "Table doesn't exist"
**Cause:** Missing `content_public` or `content_private` tables  
**Solution:**

1. Run this check in Supabase:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('content_public', 'content_private');
```

2. Should return 2 rows. If not, run `supabase-schema.sql`

---

### Error: "Table name must be lowercase"
**Cause:** Used uppercase or spaces in table name  
**Solution:**

❌ Wrong:
- `Anica Chats`
- `Anica-Chats`
- `AnicaChats`

✅ Correct:
- `anica_chats`
- `tutorials`
- `premium_course`

**Rule:** Only lowercase letters and underscores

---

### Error: GitHub Actions "deprecated version of upload-artifact"
**Status:** ✅ FIXED  
**Solution:** Already updated to v4 in `.github/workflows/screenshot-generator.yml`

If you still see this:
1. Pull latest code
2. Check line 38 of `screenshot-generator.yml`
3. Should say `actions/upload-artifact@v4`

---

### Error: "Supabase connection failed"
**Possible Causes:**

1. **Wrong URL format**
   - ❌ `your-project.supabase.co`
   - ✅ `https://your-project.supabase.co`

2. **Wrong key**
   - Make sure you're using the **anon/public** key
   - Not the **service_role** key (that's secret!)

3. **RLS policies blocking**
   - Check if Row Level Security is too restrictive
   - Schema includes permissive policies for testing

**Test connection:**
```javascript
// In browser console:
console.log(supabaseClient.isConnected);
```

---

### Error: "Content not appearing in public library"
**Checklist:**

1. **Is content saved?**
   - Check admin panel "Manage Content" section
   - Should see your content listed

2. **Is folder public?**
   - Check folder visibility setting
   - Private folders won't show in public library (yet)

3. **Check localStorage:**
   - Open browser console (F12)
   - Run: `localStorage.getItem('3c-library-data')`
   - Should return JSON data

4. **Sync issue:**
   - Click "Test Connection" in admin
   - Reload public library page

---

### Error: "PDF not loading" or "PDF viewer blank"
**Possible Causes:**

1. **Invalid PDF URL**
   - Check if URL is accessible
   - Try opening URL directly in browser

2. **CORS issue**
   - External PDFs might block cross-origin access
   - Solution: Upload to R2 or use base64

3. **Large file**
   - PDFs over 50MB may be slow
   - Check browser console for timeout errors

**Test:**
```javascript
// In console:
pdfjsLib.getDocument('YOUR_PDF_URL').promise
  .then(pdf => console.log('PDF loaded:', pdf.numPages))
  .catch(err => console.error('PDF error:', err));
```

---

### Error: "Debug panel won't open"
**Public Library:**
- Password required: `debug3c`
- Change password in `library.html` line 701

**Admin Panel:**
- Should open without password
- Check if `toggleDebug()` function exists

---

## 🔍 Debugging Steps

### Step 1: Check Browser Console
```bash
1. Press F12
2. Click "Console" tab
3. Look for red errors
4. Copy error message
```

### Step 2: Check Network Tab
```bash
1. Press F12
2. Click "Network" tab
3. Reload page
4. Look for failed requests (red)
5. Click failed request
6. Check "Response" tab
```

### Step 3: Check Supabase Logs
```bash
1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Filter by "Error"
4. Look for recent errors
```

### Step 4: Verify Database
```bash
1. Open Supabase SQL Editor
2. Run verify-database.sql
3. Check all ✅ marks
4. Fix any ❌ marks
```

---

## 🌐 Cloudflare Issues

### "CNAME already exists" Error
**Cause:** Trying to use CNAME for root domain (@)  
**Solution:**

For root domain, use:
- **A record** with Vercel's IP: `76.76.21.21`
- Or **ALIAS/ANAME** if your DNS supports it

For www subdomain:
- **CNAME** to `cname.vercel-dns.com`

### "Can't add Worker" Error
**Note:** You don't need Cloudflare Workers for basic functionality!

Workers are only needed if:
- Using Cloudflare R2 for file storage
- Want custom API endpoints
- Need edge computing

**For now:** Skip Workers, use Vercel hosting

---

## 📱 Vercel Deployment Issues

### "Build failed" Error
**Check:**
1. All files committed to Git
2. No syntax errors in code
3. Vercel build settings correct

**Vercel Settings:**
- Framework: Other
- Build Command: (leave empty)
- Output Directory: (leave empty)
- Install Command: (leave empty)

This is a static site, no build needed!

### "Domain not working" Error
**Steps:**
1. Add domain in Vercel dashboard
2. Vercel shows DNS records needed
3. Add those exact records in your DNS
4. Wait 24-48 hours for propagation

**Check propagation:**
```bash
# In terminal:
nslookup your-domain.com

# Or use online tool:
# https://www.whatsmydns.net
```

---

## 💾 Data Issues

### "Lost all my content!"
**Don't panic!** Data is in Supabase, not localStorage.

**Recovery:**
1. Open admin panel
2. Click "Test Connection"
3. Data should reload from Supabase

**If still missing:**
```sql
-- Check in Supabase SQL Editor:
SELECT COUNT(*) FROM folders;
SELECT COUNT(*) FROM content_public;
SELECT COUNT(*) FROM content_private;
```

### "Duplicate folders appearing"
**Cause:** Multiple folder creations with same name  
**Solution:** Slugs are auto-incremented

- First: `my-folder-01`
- Second: `my-folder-02`
- Third: `my-folder-03`

Delete duplicates from admin panel.

---

## 🔐 Security Issues

### "Anyone can access admin panel!"
**Current state:** Admin panel has no authentication  
**For production:** Add authentication

**Quick fix:**
1. Don't share admin URL
2. Use obscure URL path
3. Add password protection

**Better solution:**
- Implement Supabase Auth
- Add login page
- Use RLS policies

### "Private content is public!"
**Check:**
1. Folder visibility setting
2. RLS policies in Supabase
3. Current policy allows all (for testing)

**To restrict:**
```sql
-- Update policy:
DROP POLICY "Authenticated read access for private content" ON content_private;

CREATE POLICY "Strict private content access"
ON content_private FOR SELECT
USING (auth.role() = 'authenticated');
```

---

## 📊 Performance Issues

### "Admin panel slow to load"
**Causes:**
1. Large number of folders/content
2. Large base64 images
3. Slow Supabase connection

**Solutions:**
- Use R2 for file storage (not base64)
- Implement pagination
- Add loading indicators
- Cache data in localStorage

### "Public library slow"
**Solutions:**
- Enable Cloudflare CDN
- Optimize images
- Lazy load content
- Use thumbnails instead of full images

---

## 🆘 Still Stuck?

### Information to Gather:

1. **Error message** (exact text)
2. **Browser console** (screenshot)
3. **Network tab** (failed requests)
4. **Supabase logs** (if applicable)
5. **Steps to reproduce**

### Quick Checks:

```bash
✅ Ran supabase-schema.sql?
✅ All tables exist?
✅ Supabase credentials correct?
✅ Browser cache cleared?
✅ Using latest code?
✅ Checked browser console?
✅ Tried different browser?
```

### Reset Everything:

**Nuclear option** (if nothing works):

1. **Database:**
```sql
-- In Supabase SQL Editor:
DROP VIEW IF EXISTS folders_with_stats CASCADE;
DROP VIEW IF EXISTS content_with_folder CASCADE;
DROP VIEW IF EXISTS popular_content CASCADE;
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP TABLE IF EXISTS content_private CASCADE;
DROP TABLE IF EXISTS content_public CASCADE;
DROP TABLE IF EXISTS folders CASCADE;

-- Then re-run supabase-schema.sql
```

2. **Browser:**
```javascript
// In console:
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

3. **Vercel:**
- Redeploy from dashboard
- Or: `vercel --prod --force`

---

## 📞 Getting Help

### Before asking for help:

1. ✅ Read this troubleshooting guide
2. ✅ Check QUICK-FIX-SETUP.md
3. ✅ Run verify-database.sql
4. ✅ Check browser console
5. ✅ Try in different browser

### When asking for help, include:

1. Error message (exact text)
2. What you were trying to do
3. What happened instead
4. Browser and version
5. Screenshot of error
6. Console logs

---

## 💡 Pro Tips

### Prevent Issues:

1. **Always test in admin first** before checking public library
2. **Use debug panel** to verify data
3. **Check console** for warnings
4. **Backup Supabase** regularly
5. **Use version control** (Git)

### Best Practices:

1. **Folder naming:** Use clear, descriptive names
2. **Table naming:** Stick to lowercase_with_underscores
3. **Content organization:** Group related content
4. **File sizes:** Keep under 10MB when possible
5. **Testing:** Test each feature after changes

### Useful Bookmarks:

- Supabase Dashboard
- Vercel Dashboard
- Admin Panel
- Public Library
- GitHub Repository

---

**Remember:** Most issues are simple fixes. Check the basics first! 🎯
