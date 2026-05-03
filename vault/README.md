# 🥷 Aurion's Vault

## 🌐 3C Public Library — Aurion’s Interactive Learning Environment

Welcome to the 3C Public Library, a dynamic and interactive digital environment designed to support personal development through structured learning, reflection, and engagement.

This project is part of the 3C Thread To Success™ ecosystem — a growing digital platform that combines creativity, structure, and real-world application.

The 3C Thread To Success™ brand, including its name, structure, characters (Aurion 3C Mascot), and overall system design, remains the intellectual property of the creator and is not included in this license.

Commercial use of the brand or replication of the ecosystem identity is not permitted without permission.

### 🎭 The 3C Ecosystem

This project is part of a larger system built around three core identities:

Aurion → Engagement & Experience
Caelum → Structure & Direction
Anica (Founder) → Authority & Vision

Together, they create a balanced environment for growth, learning, and progression.

**Location:** `/vault/` — subfolder of the `3c-content-library` repository

---

## What Is This?

Aurion's Vault is a standalone interactive tools and games platform, cloned and adapted from the root `library.html` of the 3C Public Library. It lives in its own subfolder so that issues on either side never affect the other — while both share the same underlying infrastructure (Supabase, Cloudflare, config).

The Vault is the home for interactive learning tools, games, and experiences curated by **3C Thread To Success** and served through the **Aurion** mascot — the 3C community ninja bot. 🥷

---

## How It Works

The Vault follows the exact same folder/content structure as the Public Library:

- **Root folders** → e.g. Quizzes, Card Games, Spin the Wheel
- **Sub-folders** → nested collections within each tool type
- **Content items** → each item holds a launch URL, thumbnail, title, and type

When a member clicks a content item, it opens in a **full-screen iframe modal** inside the vault page. The modal is chief — content loads inside it, the member stays in the vault experience.

---

## Files in This Folder

| File | Purpose |
|---|---|
| `vault.html` | Main vault page — cloned from `library.html`, vault-branded |
| `library-core.js` | Vault logic — cloned from root `library-core.js`, adapted for vault tables |
| `vault-supabase-client.js` | Vault database client — reads from `vault_folders`, `vault_content`, `vault_folder_passwords` |

### Shared from root (referenced via `../`)
| File | Purpose |
|---|---|
| `../config.js` | Supabase URL + keys |
| `../password-utils.js` | Password hashing for private folders |
| `../cookie-banner.js` | GDPR cookie consent |
| `../3C Thread To Success logo.png` | Shared branding |
| `../favicon1.png` | Shared favicon |

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `vault_folders` | Root and sub-folder structure |
| `vault_content` | All vault content items |
| `vault_folder_passwords` | Password protection for private folders |
| `vault_folders_with_stats` | View — mirrors `folders_with_stats` for item counts |

All vault tables mirror the exact column structure of the library tables for consistency.

---

## Connected Repositories

The vault acts as a **launcher and directory** — it stores the URL to each tool and opens it in the modal. Each tool lives in its own separate GitHub repository, keeping this library repository clean and focused.

| Repository | Purpose | Status |
|---|---|---|
| `3c-quiz-admin` | Quiz engine — reads JSON from Cloudflare R2 | ✅ Live |
| `3c-spin-wheel` | Spin the Wheel interactive tool | 🔜 Planned |
| `3c-card-game` | Card reveal game | 🔜 Planned |
| `3c-puzzle` | Interactive puzzle tool | 🔜 Planned |
| `3c-crossword` | Crossword learning tool | 🔜 Planned |

Each repo will follow the same pattern as `3c-quiz-admin`:
- Standalone HTML/JS app hosted on GitHub Pages
- JSON config stored in Cloudflare R2
- Launched via URL stored in `vault_content.url`
- Opens in the vault modal — member stays in the experience

---

## Navigation Logic

| Where member is | Toolbar button | Goes to |
|---|---|---|
| Vault root (folder grid) | 📚 Public Library | `../library.html` |
| Inside any vault subfolder | 🥷 Vault Library | `vault.html` |

---

## Content Types Supported

All standard library types plus vault-specific interactive tools:

`pdf` · `flipbook` · `presentation` · `video` · `image` · `gif` · `audio` · `link` · `quiz` · `card-game` · `spin-wheel` · `landing-page`

---

## Authorship

| Role | Credit |
|---|---|
| **Vision, Strategy & Direction** | Chef Anica — 3C Thread To Success |
| **Architecture, Engineering & Build** | Claude Sonnet 4.6 by Anthropic |

> *"Think it. Do it. Own it."* — ATA Active Thinking Approach

Built through a human-AI partnership under the **3C Laws of Instructions** — precision engineering, zero shortcuts.

---

## Version History

| Version | Date | Notes |
|---|---|---|
| 1.0 | March 2026 | Initial build — vault structure, Supabase tables, quiz integration |

---

## 🎨 Credits

*Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica · 3C Thread To Success™ Cooking Lab*

---

## 👤 Creator

Anica-blip (“Chef”)
Founder of 3C Thread To Success™ ("Cooking Lab")
Independent Creator | Community Builder

