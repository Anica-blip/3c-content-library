# 🎯 Quick Reference Card

## Cloudflare API Keys

### Where to Add Them?

| Platform | Need Cloudflare Keys? | Why? |
|----------|----------------------|------|
| **Supabase** | ❌ NO | Uses its own credentials |
| **Vercel** | ❌ NO | Hosts static files only |
| **GitHub** | ✅ YES (optional) | For R2 screenshot generation |

### GitHub Secrets (if using R2):
```
Settings → Secrets → Actions

Add:
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
```

**Note:** R2 is optional. Skip it for now!

---

## URL Structure

### Folders
```
Title:      "Anica Coffee Break Chats"
Table Name: anica_chats
Slug:       anica-coffee-break-chats (no number)
URL:        ?folder=anica-coffee-break-chats
```

### Content
```
Table Name: anica_chats
Slug:       anica-chats-01, anica-chats-02, etc.
URL:        ?folder=anica-coffee-break-chats&content=anica-chats-01
```

### Key Difference
- **Folder:** Full title → slug (no number unless duplicate)
- **Content:** Table name → slug-01, slug-02 (always numbered)

---

## Quick Setup

### 1. Database
```sql
-- Run in Supabase SQL Editor:
-- File: add-slugs-migration.sql
```

### 2. Create Folder
```
Admin Panel:
- Title: "Anica Coffee Break Chats"
- Table: "anica_chats" (lowercase, underscores)
- Visibility: Public
```

### 3. Add Content
```
Admin Panel:
- Select folder
- Add title
- Upload file or paste URL
- System auto-generates: anica-chats-01
```

### 4. Verify
```
Public Library:
- URL should show: ?folder=anica-coffee-break-chats
- Content URL: &content=anica-chats-01
```

---

## Naming Rules

### Folder Title
```
✅ "Anica Coffee Break Chats"
✅ "Premium Course 2024"
❌ "anica-coffee-break-chats" (use proper case)
```

### Table Name
```
✅ anica_chats
✅ premium_course
❌ Anica_Chats (no uppercase)
❌ anica-chats (no hyphens)
❌ anica chats (no spaces)
```

---

## Common Commands

### Verify Database
```sql
-- Check slug columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'content_public' AND column_name = 'slug';

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('generate_slug', 'generate_content_slug');
```

### Regenerate Slugs
```sql
-- Folders
UPDATE folders SET slug = generate_slug(title) WHERE slug IS NULL;

-- Content
UPDATE content_public c
SET slug = generate_content_slug(c.title, c.folder_id, c.table_name)
WHERE slug IS NULL;
```

---

## File Checklist

### Run These:
- [ ] `add-slugs-migration.sql` (in Supabase)
- [ ] Test folder creation
- [ ] Test content creation
- [ ] Verify URLs

### Read These:
- [ ] `CLOUDFLARE-AND-URLS-SUMMARY.md` (detailed answers)
- [ ] `URL-STRUCTURE.md` (URL format guide)
- [ ] `QUICK-FIX-SETUP.md` (full setup)

---

## Example Workflow

```
1. Create Folder:
   Title: "Anica Coffee Break Chats"
   Table: anica_chats
   → Generates: anica-coffee-break-chats

2. Add Content:
   Title: "Episode 1"
   → Generates: anica-chats-01

3. Add More:
   Title: "Episode 2"
   → Generates: anica-chats-02

4. Share:
   URL: library.html?folder=anica-coffee-break-chats&content=anica-chats-01
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No slug generated | Run migration SQL |
| Wrong slug format | Check table_name uses underscores |
| Duplicate slugs | Functions prevent this - check manually |
| CONFIG error | Already fixed - clear browser cache |

---

## Support Files

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Full database schema |
| `add-slugs-migration.sql` | Add slugs to existing DB |
| `verify-database.sql` | Check DB setup |
| `URL-STRUCTURE.md` | URL format details |
| `CLOUDFLARE-AND-URLS-SUMMARY.md` | This guide expanded |
| `TROUBLESHOOTING.md` | Common issues |

---

**Quick Start:** Run `add-slugs-migration.sql` → Create folder → Add content → Done! ✅
