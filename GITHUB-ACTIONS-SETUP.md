# 🔧 GitHub Actions Setup Guide

## What is GitHub Actions?

GitHub Actions is an automation tool that runs tasks automatically on GitHub's servers. Your project has a workflow that generates screenshots daily, but it needs some configuration.

---

## ✅ Fixes Applied

### 1. **Node.js Version Updated** ✅
- Changed from Node.js 18 to **Node.js 20**
- This fixes the deprecation warning
- GitHub Actions will now use the latest Node.js

### 2. **Workflow File Created** ✅
- Created `.github/workflows/generate-screenshots.yml`
- Properly configured for Node.js 20
- Ready to run once you add secrets

---

## 🔑 Setting Up GitHub Secrets

The error "Missing Supabase credentials" means you need to add your Supabase credentials to GitHub.

### Step 1: Get Your Supabase Credentials

You need two values from your `config.js`:

1. **SUPABASE_URL**: Your Supabase project URL
2. **SUPABASE_ANON_KEY**: Your Supabase anonymous key

**Where to find them**:
- Open `Dashboard-library/config.js`
- Look for:
  ```javascript
  supabase: {
      url: 'https://cgxjqsbrditbteqhdyus.supabase.co',  // ← This is SUPABASE_URL
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'  // ← This is SUPABASE_ANON_KEY
  }
  ```

### Step 2: Add Secrets to GitHub

1. **Go to your GitHub repository**
   ```
   https://github.com/Anica-blip/3c-content-library
   ```

2. **Click Settings** (top menu)

3. **Click "Secrets and variables"** (left sidebar)

4. **Click "Actions"**

5. **Click "New repository secret"**

6. **Add SUPABASE_URL**:
   - Name: `SUPABASE_URL`
   - Secret: `https://cgxjqsbrditbteqhdyus.supabase.co`
   - Click "Add secret"

7. **Add SUPABASE_ANON_KEY**:
   - Click "New repository secret" again
   - Name: `SUPABASE_ANON_KEY`
   - Secret: (paste your full anon key from config.js)
   - Click "Add secret"

---

## 🚀 Testing the Workflow

### Option 1: Manual Trigger (Recommended)

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Click **Generate Screenshots** workflow (left sidebar)
4. Click **Run workflow** button
5. Click the green **Run workflow** button
6. Watch it run!

### Option 2: Wait for Automatic Run

The workflow runs automatically every day at 2 AM UTC.

---

## 📊 What the Workflow Does

```
1. Checks out your code from GitHub
   ↓
2. Sets up Node.js 20
   ↓
3. Installs npm dependencies
   ↓
4. Runs the screenshot generator script
   ↓
5. Commits and pushes any new screenshots
   ↓
6. ✅ Done!
```

---

## 🔍 Checking if It Worked

### After running the workflow:

1. Go to **Actions** tab on GitHub
2. Click on the latest workflow run
3. Check for green checkmarks ✅
4. If there are errors, click on the failed step to see details

### Expected Output:
```
✅ Checkout repository
✅ Setup Node.js 20
✅ Install dependencies
✅ Generate screenshots
✅ Commit and push if changed
```

---

## ❌ Troubleshooting

### Error: "Missing Supabase credentials"
**Solution**: Add the GitHub Secrets (see Step 2 above)

### Error: "Node.js 18 deprecated"
**Solution**: Already fixed! The workflow now uses Node.js 20

### Error: "Permission denied"
**Solution**: 
1. Go to Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Click Save

### Error: "Script not found"
**Solution**: Make sure `Dashboard-library/.github/scripts/generate-screenshots.js` exists in your repository

---

## 📝 Quick Setup Checklist

- [ ] Push the new `.github/workflows/generate-screenshots.yml` file
- [ ] Add `SUPABASE_URL` secret to GitHub
- [ ] Add `SUPABASE_ANON_KEY` secret to GitHub
- [ ] Enable workflow write permissions (if needed)
- [ ] Manually trigger the workflow to test
- [ ] Check for green checkmarks ✅

---

## 🎯 Summary

### What We Fixed:
1. ✅ Updated Node.js from 18 to 20 in GitHub Actions
2. ✅ Created proper workflow configuration
3. ✅ Ready to add Supabase credentials

### What You Need to Do:
1. Push the new workflow file (we'll do this next)
2. Add GitHub Secrets (5 minutes)
3. Test the workflow (2 minutes)

### Result:
- ✅ No more Node.js deprecation warnings
- ✅ Automated screenshot generation working
- ✅ Runs daily automatically

---

## 💡 Optional: Disable the Workflow

If you don't want automatic screenshots:

1. Go to **Actions** tab
2. Click **Generate Screenshots** workflow
3. Click the **⋯** (three dots) menu
4. Click **Disable workflow**

You can always re-enable it later!

---

**Next Step**: Let's push this fix to GitHub!
