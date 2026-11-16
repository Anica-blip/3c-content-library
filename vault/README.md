# 🥷 Aurion's Vault

> ⚖️ This repository is protected under a binding [Legal Disclaimer](../LEGAL_DISCLAIMER.md) that governs all use, cloning, and forking from the date of inception. Please read before use.

> Aurion's interactive learning environment: tools, games and series content of the 3C Thread To Success™ ecosystem.
> Part of the 3C Public Library at [3c-public-library.org](https://3c-public-library.org).

**Location:** `/vault/` — subfolder of the `3c-content-library` repository

---

**⚠️ Intellectual Property Notice**
This repository is open source under the MIT License — the code skeleton is free to clone and adapt.
The 3C Thread To Success™ brand, including its name, structure, characters (Caelum, Aurion, Jan, Anica), persona system (Falcon, Panther, Wolf, Lion), philosophy, and overall ecosystem identity remains the intellectual property of the creator and is **not** included in this license.
Commercial use of the brand or replication of the ecosystem identity is not permitted without permission.

---

## 🎭 The 3C Ecosystem

This project is part of a larger system built around three core identities:

**Aurion** → Engagement & Experience — 3C Mascot, community voice, diamond-energy guide
**Caelum** → Structure & Direction — Chief Advisor, PR Manager, Brand Integrity Officer
**Anica (Founder)** → Authority & Vision — Systems Strategist, Project Architect, the Chef

Together, they create a balanced environment for growth, learning, and progression.

---

## 🗃️ What Is Aurion's Vault?

Aurion's Vault is the interactive tools and games section of the library. It was cloned from the root `library.html` of the 3C Public Library and adapted. It lives in its own subfolder so that an issue on either side never affects the other, while both share the same Supabase project, Cloudflare setup and external apps.

The Vault is the home for interactive learning tools, games, series content and experiences curated by **3C Thread To Success™** and served through **Aurion**, the 3C community ninja bot. 🥷

Like the rest of the library, the Vault is free to visit. Visitors do not sign in.

---

## 🧭 How It Works

The Vault follows the same folder and content structure as the Public Library:

- **Root folders** — for example Quizzes, Card Games, Spin the Wheel
- **Sub-folders** — nested collections within each tool type
- **Content items** — each item holds a launch URL, thumbnail, title and type

When a visitor clicks a content item, it opens in a **full-screen modal** inside the Vault page, so the visitor stays in the Vault experience.

### Content page styles

Each folder is shown in one of two styles, chosen per folder in the admin panel and stored in the `display_style` column of `vault_folders`:

| Style | Layout | Content comes from |
|---|---|---|
| **Default** | Thumbnails in a left column; the thumbnail clicked opens in the right column | `vault_content` |
| **New style** (series) | All thumbnails lined up in rows or a grid | `content_series` (shared with the Main Library) |

The Vault uses the new style for most of its folders, because it suits series content. Full details are in [SETUP.md](../SETUP.md).

---

## 📁 Files in This Folder

| File | Purpose |
|---|---|
| `vault.html` | Main Vault page, cloned from `library.html` and Vault-branded |
| `library-core.js` | Vault logic, cloned from the root `library-core.js` and adapted for Vault tables |
| `vault-supabase-client.js` | Vault database client |
| `vault-skin.css` | Vault styling |
| `3C ClubHouse logo.png`, `Aurion_button.png`, `today-pick.png` | Vault images |
| `chat/` | Drop In chat and Reviews pages, with their admin pages |

### Shared from the root (referenced via `../`)

| File | Purpose |
|---|---|
| `../config.js` | Supabase URL and public key |
| `../password-utils.js` | Password handling for private folders |
| `../pdf-viewer-enhanced.js` | PDF viewer |
| `../cookie-banner.js` | Cookie notice (records the visitor's choice; the site sets no advertising or analytics cookies) |
| `../favicon1.png` | Shared favicon |

The Drop In chat and reviews run on a Cloudflare Worker, whose code is `../worker/index.js`.

---

## 🗄️ Supabase Tables

| Table | Purpose |
|---|---|
| `vault_folders` | Root and sub-folder structure, including `display_style` |
| `vault_content` | Content items for default style folders |
| `vault_folder_passwords` | Password protection for private folders |
| `vault_comments` | Visitor comments |
| `vault_folders_with_stats` | View of folders with item counts |
| `content_series` | Series content for new style folders (shared with the Main Library) |

Vault tables mirror the column structure of the library tables for consistency. Writes are owner-only, and visitors' comment emails are not readable by the public.

---

## 🔗 Connected Apps

The Vault is a **launcher and directory**. Each item stores the URL of a tool and opens it in the modal. The tools live in their own repositories or are added in the admin panel as an external link, landing page, virtual slideshow, quiz or game. This keeps the library repository clean and focused. See [SETUP.md](../SETUP.md) for the setup of each type.

### Content types supported

`pdf` · `flipbook` · `presentation` · `video` · `image` · `gif` · `audio` · `link` · `quiz` · `card-game` · `spin-wheel` · `landing-page` · `virtual-slideshow` · `other`

---

## 🧷 Navigation

| Where the visitor is | Toolbar button | Goes to |
|---|---|---|
| Vault root (folder grid) | 📚 Public Library | `../library.html` |
| Inside any Vault subfolder | 🥷 Vault Library | `vault.html` |

---

## 📜 Version History

| Version | Date | Notes |
|---|---|---|
| 1.0 | March 2026 | Initial build: Vault structure, Supabase tables, quiz integration |
| 1.1 | November 2026 | Two content page styles, security hardening, Privacy Policy and Terms of Use, self-hosted fonts |

---

## 🎨 Credits

*Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab* 🧪👨‍🍳

*"Think Smarter, Not Harder — Zero Shortcuts"*

---

## 👤 Creator

**Anica-blip ("Chef")**
Founder of 3C Thread To Success™ ("Cooking Lab")
Independent Creator | Community Builder

---

## 🧠 Philosophy

*"Think it. Do it. Own it."*

This project was built from vision, persistence, and a commitment to creating meaningful and structured experiences — even with minimal resources. The Vault exists so that learning can feel like play.
