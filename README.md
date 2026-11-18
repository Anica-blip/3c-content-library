# 📚 3C Content Library

> ⚖️ This repository is protected under a binding [Legal Disclaimer](./LEGAL_DISCLAIMER.md) that governs all use, cloning, and forking from the date of inception. Please read before use.

> The content library of the 3C Thread To Success™ ecosystem, live at [3c-public-library.org](https://3c-public-library.org).
> Two sections share one engine: the **3C Public Library** (the main library) and **Aurion's Vault** (interactive tools, games and series content).

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

## 🗃️ What Is the 3C Content Library?

A free, public library of PDFs, flipbooks, presentations, videos, images, quizzes, games and other interactive tools, managed from a private admin panel. Visitors do not sign in and nothing is sold.

**Inside the library:**
- 📖 **Flipbook Viewer** — page-turning viewer with videos, GIFs, audio, buttons, hotspots and links, on desktop and mobile
- 🖥️ **Presentation Viewer** — slide viewer with the same interactive elements, on desktop and mobile
- 🔗 **PDF Viewers** — a PDF viewer that opens links inside the PDF in draggable pop-ups, and an interactive PDF viewer
- 📁 **Folders and Sub-folders** — each folder is displayed in one of two content page styles (see below)
- 💬 **Comments, Drop In Chat and Reviews** — visitors can comment where a page offers it, chat through the Drop In Worker, and leave reviews that are approved before they appear
- 🔒 **Private Folders** — password-protected folders, kept in a separate private library
- 🧰 **Build Kit** — a links page managed from the admin side
- 🔗 **Share Previews** — social share previews for both the Public Library and Aurion's Vault

### Content page styles

| Style | Layout | Typical use |
|---|---|---|
| **Default** | Thumbnails in a left column; the thumbnail clicked opens in the right column | Single items and documents |
| **New style** (series) | All thumbnails lined up in rows or a grid | Series content, mostly in Aurion's Vault |

Full details are in [SETUP.md](SETUP.md).

---

## 🥷 Aurion's Vault

Aurion's Vault lives in the `/vault/` folder. It was cloned from the Public Library and adapted, so that a problem on either side never affects the other. It uses its own database tables (`vault_*`) and shares the same Supabase project, Cloudflare setup and external apps. See [vault/README.md](vault/README.md).

---

## ⚙️ How It Is Built

| Part | What it is |
|---|---|
| Front end | Plain HTML, CSS and JavaScript — no framework |
| Database | Supabase (PostgreSQL, EU region) with row-level security |
| Files | Cloudflare R2, served from `files.3c-public-library.org` |
| API | Cloudflare Worker `3c-library-api` at `api.3c-public-library.org` (`cloudflare-worker.js`, `wrangler.toml`) for owner-only uploads |
| Chat, reviews, Build Kit and share previews | Cloudflare Worker `dropin-chat` with KV storage (`worker/index.js`) |
| Hosting | Cloudflare Pages, deployed from this repository by GitHub Actions (`.github/workflows/cloudflare-pages.yml`) |
| Admin access | Cloudflare Zero Trust, then GitHub sign-in, then an owner check against Supabase |
| Fonts | Self-hosted in `/fonts/` (SIL Open Font License) |

Libraries such as PDF.js, Turn.js and the Supabase client are currently loaded from public code networks (jsDelivr and cdnjs). The Privacy Policy lists these.

---

## 🔐 Security and Privacy

- Writes to the database are owner-only; the public can read published content and add comments.
- Visitors' comment emails are not readable by the public.
- Uploads go through an owner-only Worker.
- Every admin route of the Drop In Worker needs the owner's GitHub sign-in. There is no shared admin key.
- The site sets no advertising or analytics cookies. See [privacy.html](privacy.html), [terms.html](terms.html) and `cookie-banner.js`.

---

## 📖 Documentation

- [SETUP.md](SETUP.md) — setup guide, content page styles, Cloudflare Workers and deployment
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the whole system fits together
- [FLIPBOOK-SYSTEM.md](FLIPBOOK-SYSTEM.md) — flipbook viewer documentation
- [LEGAL_DISCLAIMER.md](LEGAL_DISCLAIMER.md) — legal protection notice
- [docs-archive/](docs-archive/) — older guides, kept for reference

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

This project was built from vision, persistence, and a commitment to creating meaningful and structured experiences — even with minimal resources. The library exists so that everything Chef builds has a home that is open, structured and free to visit.
