# URL Sharing Guide - 3C Public Library

## Understanding URL Structure

Your library has different levels of access through URLs. Here's how it works:

---

## 1. **Main Library URL** (All Folders)

```
http://localhost:8000/library-enhanced.html
```

**What users see:**
- Grid of ALL folders
- Can browse any folder
- Full library access

**Use this when:**
- You want to share your entire library
- Public landing page
- General access

---

## 2. **Specific Folder URL** (Single Folder Only)

```
http://localhost:8000/library-enhanced.html?folder=FOLDER_ID
```

**What users see:**
- ONLY content in that specific folder
- Sidebar shows items in that folder
- No other folders visible
- Cannot navigate to other folders

**Use this when:**
- You want to share only specific content
- Different audiences get different folders
- Controlled access to certain materials

**Example:**
```
http://localhost:8000/library-enhanced.html?folder=abc123xyz
```
Users with this link will ONLY see content in folder "abc123xyz"

---

## 3. **Specific Content URL** (Direct to One Item)

```
http://localhost:8000/library-enhanced.html?folder=FOLDER_ID&content=CONTENT_ID
```

**What users see:**
- Opens directly to that specific PDF/video/content
- Sidebar shows other items in same folder
- Can navigate to other items in that folder only

**Use this when:**
- Sharing a specific document
- Direct link to one PDF
- Quick access to particular content

---

## How to Get These URLs

### From Admin Dashboard:

1. **Folder URL:**
   - Go to "Manage Folders" section
   - Find your folder
   - Click "Copy URL" button
   - Share this URL to give access to ONLY that folder

2. **Content URL:**
   - Go to "Manage Content" section
   - Find your content item
   - Click "Copy URL" button
   - Share this URL for direct access to that item

---

## Privacy & Access Control

### ✅ What This Means:

**YES - Folder URLs are isolated:**
- Folder URL shows ONLY that folder's content
- Users cannot see other folders
- Users cannot navigate to other folders
- Perfect for selective sharing

**Example Scenario:**
```
Folder A: "Client Projects" → URL A
Folder B: "Internal Documents" → URL B
Folder C: "Public Resources" → URL C

Share URL A with clients → They see ONLY Client Projects
Share URL C publicly → They see ONLY Public Resources
Keep URL B private → Only you can access via main library
```

### ⚠️ Important Notes:

1. **URLs are not password protected**
   - Anyone with the URL can access it
   - Don't share sensitive folder URLs publicly
   - URLs are long and hard to guess

2. **Content is still public if URL is known**
   - This is like Google Drive "Anyone with link" sharing
   - Not meant for highly sensitive data
   - Good for controlled distribution

3. **Main library URL shows everything**
   - Only share main URL if you want full access
   - Use folder URLs for selective sharing

---

## Best Practices

### ✅ DO:

- **Use folder URLs** for different audiences
- **Share specific content URLs** for direct access
- **Keep main library URL** for yourself or trusted users
- **Organize content** into folders by audience/purpose

### ❌ DON'T:

- Don't share main library URL if you want restricted access
- Don't put sensitive data without additional security
- Don't rely on obscurity alone for security

---

## Example Use Cases

### Use Case 1: Magazine Issues
```
Folder: "Anica Coffee Breach Chats"
URL: library-enhanced.html?folder=xyz789

Share this URL:
- Subscribers see ONLY magazine issues
- They cannot see your other folders
- Clean, focused experience
```

### Use Case 2: Client Deliverables
```
Folder: "Client A - Deliverables"
Folder: "Client B - Deliverables"

Give Client A their folder URL → They see only their files
Give Client B their folder URL → They see only their files
Clients cannot see each other's content
```

### Use Case 3: Public Resources
```
Main Library URL: All folders visible
Folder URL: Only "Public Resources" folder
Content URL: Direct link to specific guide

Share different URLs based on what you want people to access
```

---

## Summary

**Your question:** "Say I only want people to link to a specific folder and not the whole library, that means I'll give the folder url and that's what they'll see, no other content, unless I give this current link, is that correct?"

**Answer:** **YES, exactly correct!** 

- Folder URL = ONLY that folder's content
- Main library URL = ALL folders
- You control what people see by which URL you share
- Perfect for selective content distribution

---

## Technical Details

The URL parameters work like this:

- No parameters → Show all folders
- `?folder=ID` → Show only that folder
- `?folder=ID&content=ID` → Show that folder + open specific item

The public library checks the URL and displays accordingly. Users cannot modify the URL to see other folders unless they know the folder IDs (which are long random strings).

---

**Need more control?** Consider:
- Password protecting the entire site with server authentication
- Using a proper CMS with user accounts
- Hosting on a platform with access controls

But for most use cases, folder-specific URLs provide excellent control over what different audiences can access!
