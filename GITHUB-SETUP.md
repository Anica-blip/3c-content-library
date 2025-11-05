# GitHub Setup & Deployment Guide

## 🎯 Overview

This guide will help you set up GitHub for version control and automated deployment to your domain `3c-public-library.org`.

---

## 📋 Prerequisites

- GitHub account (free)
- Git installed on your computer
- Domain: `3c-public-library.org` configured in Cloudflare

---

## 🚀 Step 1: Initialize Git Repository

### Option A: New Repository

1. **Open Terminal** in your project folder:
   ```bash
   cd /home/acer/CascadeProjects/personal-website-2/Dashboard-library
   ```

2. **Initialize Git** (if not already done):
   ```bash
   git init
   ```

3. **Add All Files**:
   ```bash
   git add .
   ```

4. **Create First Commit**:
   ```bash
   git commit -m "Initial commit: 3C Public Library v2.0"
   ```

### Option B: Existing Repository

If `.git` folder already exists:
```bash
git add .
git commit -m "Production deployment setup with R2 and Supabase"
```

---

## 🚀 Step 2: Create GitHub Repository

1. **Go to GitHub**
   - Visit [github.com](https://github.com)
   - Click the **"+"** icon (top right)
   - Select **"New repository"**

2. **Configure Repository**
   - **Repository name:** `3c-public-library`
   - **Description:** `3C Public Library - Content management system with Supabase and Cloudflare R2`
   - **Visibility:** 
     - ✅ **Public** (if you want to share code)
     - ✅ **Private** (if you want to keep it private)
   - **DO NOT** initialize with README, .gitignore, or license
   - Click **"Create repository"**

3. **Copy Repository URL**
   - You'll see: `https://github.com/YOUR-USERNAME/3c-public-library.git`
   - Copy this URL

---

## 🚀 Step 3: Connect Local to GitHub

1. **Add Remote**:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/3c-public-library.git
   ```

2. **Push to GitHub**:
   ```bash
   git branch -M main
   git push -u origin main
   ```

3. **Verify**:
   - Refresh your GitHub repository page
   - You should see all your files!

---

## 🚀 Step 4: Set Up GitHub Pages (Option 1)

**Best for:** Simple static hosting, free, easy setup

1. **Go to Repository Settings**
   - Click **"Settings"** tab
   - Click **"Pages"** in left sidebar

2. **Configure Pages**
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
   - Click **"Save"**

3. **Wait for Deployment**
   - Takes 1-2 minutes
   - You'll see: "Your site is live at https://YOUR-USERNAME.github.io/3c-public-library/"

4. **Add Custom Domain**
   - In Pages settings, under "Custom domain"
   - Enter: `3c-public-library.org`
   - Click **"Save"**
   - Wait for DNS check (may take a few minutes)

5. **Configure DNS in Cloudflare**
   - Go to Cloudflare DNS settings
   - Add these records:
   
   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | A | @ | 185.199.108.153 | DNS only |
   | A | @ | 185.199.109.153 | DNS only |
   | A | @ | 185.199.110.153 | DNS only |
   | A | @ | 185.199.111.153 | DNS only |
   | CNAME | www | YOUR-USERNAME.github.io | DNS only |

6. **Enable HTTPS**
   - Back in GitHub Pages settings
   - Check **"Enforce HTTPS"**
   - Wait for certificate (5-10 minutes)

7. **Done!**
   - Visit: `https://3c-public-library.org`
   - Your site should be live! 🎉

---

## 🚀 Step 5: Set Up Cloudflare Pages (Option 2)

**Best for:** More control, better performance, automatic deployments

1. **Go to Cloudflare Dashboard**
   - Navigate to **"Workers & Pages"**
   - Click **"Create application"**
   - Click **"Pages"** tab
   - Click **"Connect to Git"**

2. **Connect GitHub**
   - Click **"Connect GitHub"**
   - Authorize Cloudflare
   - Select your repository: `3c-public-library`

3. **Configure Build**
   - **Project name:** `3c-public-library`
   - **Production branch:** `main`
   - **Build command:** (leave empty - no build needed)
   - **Build output directory:** `/`
   - Click **"Save and Deploy"**

4. **Wait for Deployment**
   - First deployment takes 1-2 minutes
   - You'll see: "Success! Your site is live!"

5. **Add Custom Domain**
   - Go to **"Custom domains"** tab
   - Click **"Set up a custom domain"**
   - Enter: `3c-public-library.org`
   - Click **"Continue"**
   - DNS records added automatically!
   - Wait for activation (1-2 minutes)

6. **Done!**
   - Visit: `https://3c-public-library.org`
   - Your site is live with automatic deployments! 🎉

---

## 🔄 Automatic Deployments

### With GitHub Pages:
- Push to `main` branch
- GitHub automatically rebuilds and deploys
- Takes 1-2 minutes

### With Cloudflare Pages:
- Push to `main` branch
- Cloudflare automatically rebuilds and deploys
- Takes 30-60 seconds
- Can see deployment status in Cloudflare dashboard

---

## 📝 Daily Workflow

### Making Changes

1. **Edit Files Locally**
   ```bash
   # Edit your files in VS Code or any editor
   ```

2. **Check Status**
   ```bash
   git status
   ```

3. **Add Changes**
   ```bash
   git add .
   # Or add specific files:
   git add admin.html config.js
   ```

4. **Commit Changes**
   ```bash
   git commit -m "Add new feature: improved file upload"
   ```

5. **Push to GitHub**
   ```bash
   git push
   ```

6. **Automatic Deployment**
   - GitHub/Cloudflare automatically deploys
   - Wait 1-2 minutes
   - Changes live on your domain!

---

## 🌿 Branching Strategy

### For Safe Development

1. **Create Development Branch**
   ```bash
   git checkout -b development
   ```

2. **Make Changes**
   ```bash
   # Edit files
   git add .
   git commit -m "Testing new feature"
   git push -u origin development
   ```

3. **Test on Development URL**
   - Cloudflare Pages creates preview: `development.3c-public-library.pages.dev`
   - Test thoroughly

4. **Merge to Main**
   ```bash
   git checkout main
   git merge development
   git push
   ```

5. **Production Deployed!**
   - Changes now live on `3c-public-library.org`

---

## 🔐 Environment Variables

### For Sensitive Data (Supabase keys, etc.)

**GitHub Pages:**
- Not supported - use client-side config only
- Store Supabase keys in admin dashboard

**Cloudflare Pages:**
1. Go to Pages project settings
2. Click **"Environment variables"**
3. Add variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your anon key
4. Redeploy

---

## 📊 Monitoring Deployments

### GitHub Pages
- Go to repository → **"Actions"** tab
- See deployment history
- View logs if deployment fails

### Cloudflare Pages
- Go to Pages project → **"Deployments"** tab
- See all deployments
- View logs and build output
- Rollback to previous version if needed

---

## 🚨 Troubleshooting

### Issue: "git: command not found"

**Solution:**
```bash
# Install Git
# Ubuntu/Debian:
sudo apt-get install git

# macOS:
brew install git

# Windows: Download from git-scm.com
```

### Issue: "Permission denied (publickey)"

**Solution:**
1. Set up SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```
2. Add to GitHub:
   - Copy key: `cat ~/.ssh/id_ed25519.pub`
   - GitHub → Settings → SSH Keys → New SSH key
   - Paste and save

3. Use SSH URL:
   ```bash
   git remote set-url origin git@github.com:YOUR-USERNAME/3c-public-library.git
   ```

### Issue: "Failed to deploy" on GitHub Pages

**Solution:**
1. Check repository is public (or Pages enabled for private)
2. Check branch name is correct
3. Check no build errors in Actions tab
4. Try re-deploying: Settings → Pages → Re-deploy

### Issue: Custom domain not working

**Solution:**
1. Wait 24 hours for DNS propagation
2. Check DNS records in Cloudflare
3. Verify domain ownership in GitHub/Cloudflare
4. Clear browser cache
5. Try incognito mode

---

## 🎓 Git Best Practices

### Commit Messages
```bash
# Good:
git commit -m "Add R2 file upload feature"
git commit -m "Fix: Supabase sync error on large files"
git commit -m "Update: Improve mobile responsiveness"

# Bad:
git commit -m "changes"
git commit -m "fix"
git commit -m "update stuff"
```

### What to Commit
✅ **DO commit:**
- Source code (.html, .js, .css)
- Configuration templates (.env.example)
- Documentation (.md files)
- Assets (images, icons)

❌ **DON'T commit:**
- Environment variables (.env)
- API keys or secrets
- node_modules/ (if you add npm later)
- Large binary files (use R2 instead)
- Personal data or backups

### .gitignore File
Already created for you! It excludes:
- `.env` (secrets)
- `node_modules/` (dependencies)
- `.DS_Store` (Mac files)
- Backup files

---

## 📱 Mobile Development

### Edit on GitHub.com
1. Go to your repository
2. Click on file to edit
3. Click pencil icon
4. Make changes
5. Commit directly from browser
6. Automatic deployment!

### GitHub Mobile App
1. Download GitHub app
2. View repository
3. See deployments
4. Review changes
5. Merge pull requests

---

## 🔄 Rollback to Previous Version

### GitHub Pages
```bash
# Find commit hash
git log

# Revert to specific commit
git revert COMMIT_HASH

# Or reset (careful!)
git reset --hard COMMIT_HASH
git push --force
```

### Cloudflare Pages
1. Go to Deployments tab
2. Find previous successful deployment
3. Click **"..."** menu
4. Click **"Rollback to this deployment"**
5. Instant rollback!

---

## 📊 Comparison: GitHub Pages vs Cloudflare Pages

| Feature | GitHub Pages | Cloudflare Pages |
|---------|-------------|------------------|
| **Cost** | Free | Free |
| **Build time** | 1-2 minutes | 30-60 seconds |
| **Custom domain** | ✅ Yes | ✅ Yes |
| **HTTPS** | ✅ Auto | ✅ Auto |
| **CDN** | ✅ GitHub CDN | ✅ Cloudflare CDN (faster) |
| **Rollback** | Manual | One-click |
| **Preview deploys** | ❌ No | ✅ Yes |
| **Analytics** | Limited | ✅ Built-in |
| **Functions** | ❌ No | ✅ Workers |

**Recommendation:** Use **Cloudflare Pages** for better performance and features.

---

## ✅ Deployment Checklist

Before going live:

- [ ] Git repository initialized
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Deployment method chosen (Pages or Cloudflare)
- [ ] Custom domain configured
- [ ] DNS records added in Cloudflare
- [ ] HTTPS enabled
- [ ] Test deployment successful
- [ ] Admin dashboard accessible
- [ ] Public library accessible
- [ ] R2 file uploads working
- [ ] Supabase sync working
- [ ] Mobile responsive
- [ ] All links working

---

## 🎉 You're Live!

Your library is now:
- ✅ Version controlled with Git
- ✅ Backed up on GitHub
- ✅ Automatically deployed
- ✅ Live on your custom domain
- ✅ Using professional infrastructure

**Next Steps:**
1. Add your content
2. Share with users
3. Monitor analytics
4. Keep improving!

---

**Questions?** Check GitHub documentation or create an issue in your repository.
