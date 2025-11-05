# 🚀 Quick Start Guide - Production Deployment

## Your Setup
- ✅ Domain: `3c-public-library.org`
- ✅ Cloudflare R2 account ready
- ✅ Supabase project created (basic)

---

## Step-by-Step Deployment (30 minutes)

### 1️⃣ Supabase Setup (5 minutes)
**What:** Database for content sync across devices

1. Open your Supabase project
2. Go to SQL Editor → New Query
3. Run this SQL:
```sql
CREATE TABLE library_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE library_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for library_backups"
ON library_backups FOR ALL
USING (true)
WITH CHECK (true);
```
4. Get your credentials: Settings → API
   - Copy **Project URL**
   - Copy **anon public key**

✅ **Done!** See [SUPABASE-SETUP.md](SUPABASE-SETUP.md) for details.

---

### 2️⃣ Cloudflare R2 Setup (10 minutes)
**What:** File storage with zero bandwidth costs

1. **Create R2 Bucket**
   - Cloudflare Dashboard → R2 → Create bucket
   - Name: `3c-library-files`
   - Click Create

2. **Enable Public Access**
   - Open bucket → Settings → Public access
   - Connect domain: `files.3c-public-library.org`
   - DNS records added automatically!

3. **Create API Token**
   - R2 → Manage R2 API Tokens
   - Create token with Read & Write permissions
   - **Save these credentials!** (you won't see them again)

4. **Deploy Worker**
   - Workers & Pages → Create Worker
   - Name: `3c-library-api`
   - Copy code from `worker-api.js` → Paste → Deploy
   - Settings → Bindings → Add R2 binding
     - Variable: `R2_BUCKET`
     - Bucket: `3c-library-files`
   - Triggers → Add custom domain: `api.3c-public-library.org`

5. **Test Worker**
   - Visit: `https://api.3c-public-library.org/api/upload/health`
   - Should see: `{"status":"ok"}`

✅ **Done!** See [CLOUDFLARE-R2-SETUP.md](CLOUDFLARE-R2-SETUP.md) for details.

---

### 3️⃣ Update Configuration (2 minutes)

1. **Open `config.js`** in your project
2. **Update these values:**
```javascript
const CONFIG = {
    supabase: {
        url: 'YOUR-SUPABASE-URL',  // From step 1
        anonKey: 'YOUR-ANON-KEY',   // From step 1
    },
    
    r2: {
        publicUrl: 'https://files.3c-public-library.org',
        uploadEndpoint: 'https://api.3c-public-library.org/api/upload',
    },
    
    features: {
        useCloudflareR2: true,  // Enable R2!
        enableSupabaseSync: true,
    }
};
```
3. **Save the file**

✅ **Done!**

---

### 4️⃣ GitHub & Deployment (10 minutes)
**What:** Version control and automatic deployment

1. **Initialize Git** (if not done):
```bash
cd /home/acer/CascadeProjects/personal-website-2/Dashboard-library
git init
git add .
git commit -m "Production deployment setup"
```

2. **Create GitHub Repository**
   - Go to github.com → New repository
   - Name: `3c-public-library`
   - Create (don't initialize with anything)

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR-USERNAME/3c-public-library.git
git branch -M main
git push -u origin main
```

4. **Deploy with Cloudflare Pages** (Recommended):
   - Cloudflare Dashboard → Workers & Pages → Create → Pages
   - Connect to Git → Select your repository
   - Project name: `3c-public-library`
   - Build settings: Leave empty (no build needed)
   - Deploy!
   - Add custom domain: `3c-public-library.org`

**Alternative:** Use GitHub Pages (see [GITHUB-SETUP.md](GITHUB-SETUP.md))

✅ **Done!** See [GITHUB-SETUP.md](GITHUB-SETUP.md) for details.

---

### 5️⃣ Test Everything (3 minutes)

1. **Visit your site:** `https://3c-public-library.org`
2. **Open admin:** `https://3c-public-library.org/admin.html`
3. **Configure Supabase in admin:**
   - Scroll to Supabase section
   - Paste URL and key
   - Click "Save & Enable"
   - Click "Test Connection" → Should see success!
4. **Test file upload:**
   - Create a test folder
   - Add content with a small PDF
   - Should upload to R2 automatically!
5. **Check public library:** `https://3c-public-library.org/library.html`
   - Should see your test content!

✅ **Everything working!**

---

## 🎉 You're Live!

Your library is now running on:
- ✅ Custom domain: `3c-public-library.org`
- ✅ File storage: Cloudflare R2 (unlimited, $0 bandwidth)
- ✅ Database: Supabase (auto-sync)
- ✅ Deployment: Automatic on git push
- ✅ CDN: Global, fast delivery

---

## 📊 What You Get

### Cost Breakdown (Monthly)
- **Small library (5GB, 10K views):** ~$0.08/month
- **Medium library (50GB, 100K views):** ~$0.80/month
- **Large library (500GB, 1M views):** ~$8/month
- **Domain:** ~$10/year

**Total: Less than $1/month for most use cases!**

### Features
- ✅ Unlimited file sizes
- ✅ Zero bandwidth fees
- ✅ Automatic backups
- ✅ Cross-device sync
- ✅ Interactive PDF viewer
- ✅ Dark mode
- ✅ Mobile responsive
- ✅ Professional URLs

---

## 🔄 Daily Workflow

### Adding Content
1. Open admin dashboard
2. Create folders
3. Upload files (auto-uploads to R2)
4. Content syncs to Supabase automatically
5. Share folder URLs with users

### Making Changes
1. Edit files locally
2. Commit: `git add . && git commit -m "Update"`
3. Push: `git push`
4. Automatic deployment (30-60 seconds)
5. Changes live!

---

## 🚨 Troubleshooting

### Files not uploading?
- Check Worker health: `https://api.3c-public-library.org/api/upload/health`
- Verify R2 bucket binding in Worker settings
- Check browser console for errors

### Supabase not syncing?
- Test connection in admin dashboard
- Verify credentials in config.js
- Check table exists in Supabase

### Domain not working?
- Wait 24 hours for DNS propagation
- Check DNS records in Cloudflare
- Clear browser cache

### Need more help?
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [CLOUDFLARE-R2-SETUP.md](CLOUDFLARE-R2-SETUP.md) - Detailed R2 setup
- [SUPABASE-SETUP.md](SUPABASE-SETUP.md) - Detailed Supabase setup
- [GITHUB-SETUP.md](GITHUB-SETUP.md) - Detailed GitHub setup

---

## 📚 Next Steps

1. **Remove test content**
2. **Add your real content**
3. **Customize branding** (edit HTML/CSS)
4. **Share with users**
5. **Monitor usage** in Cloudflare/Supabase dashboards

---

## 🎯 Quick Reference

### Important URLs
- **Main site:** `https://3c-public-library.org`
- **Admin:** `https://3c-public-library.org/admin.html`
- **Library:** `https://3c-public-library.org/library.html`
- **Files:** `https://files.3c-public-library.org`
- **API:** `https://api.3c-public-library.org`

### Key Files to Update
- `config.js` - Configuration (Supabase & R2 URLs)
- `admin.html` - Admin dashboard
- `library.html` - Public library
- `index.html` - Landing page

### Commands
```bash
# Local development
python3 -m http.server 8000

# Git workflow
git add .
git commit -m "Description"
git push

# Check status
git status
```

---

**You're all set! Time to build your library! 🚀**
