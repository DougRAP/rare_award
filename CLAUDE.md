# Project Memory — R.A.R.E. Award Website (RAP)

## Purpose
RAP’s **R.A.R.E. Award** site honors employees who demonstrate exceptional commitment, empathy, and willingness to help others — up to a $5,000 quarterly award.  
The website uses gold (`#D4AF37`) and navy (`#1e3a5f`) branding, Inter and Playfair Display fonts, and vanilla JavaScript (no frameworks).  
Deployment target: **Netlify static site**.

---

## 🧱 FULL FILE STRUCTURE (as verified 2025-10-19)

```
/rare_award/
│
├── index.html
├── nominate.html
├── policy.html
├── success.html
│
├── 404.html
├── README.md
├── CLAUDE.md
├── netlify.toml
├── package.json
├── robots.txt
├── sitemap.xml
├── _redirects
├── .env
├── .gitignore
│
├── css/
│   ├── style.css
│   ├── print.css                ← Print optimization stylesheet
│   ├── reset.css
│   ├── typography.css
│   ├── utilities.css
│   ├── variables.css
│   └── components/
│       ├── accordion.css
│       ├── hero.css
│       ├── forms.css
│       ├── buttons.css
│       ├── layout.css
│       └── animations.css
│
├── js/
│   ├── main.js
│   ├── navigation.js
│   ├── form-handler.js
│   ├── form-validation.js
│   ├── accordion.js
│   ├── carousel.js
│   ├── animations.js
│   ├── dark-mode.js
│   └── local-storage.js
│
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── hero-bg.jpg
│   │   ├── og-image.jpg
│   │   ├── favicon.ico
│   │   └── apple-touch-icon.png
│   ├── icons/                   ← New SVG icon set
│   │   ├── menu.svg
│   │   ├── close.svg
│   │   └── award.svg
│   ├── documents/               ← renamed from /pdf/
│   │   └── policy.pdf
│   └── fonts/
│       ├── Inter/
│       └── PlayfairDisplay/
│
├── data/
│   ├── form-config.json
│   ├── testimonials.json
│   └── winners.json
│
├── functions/                   ← Netlify serverless functions
│   ├── generate-pdf.js
│   ├── send-confirmation.js
│   └── submit-nomination.js
│
├── partials/                    ← HTML includes (header/footer fragments)
│   ├── header.html
│   └── footer.html
│
├── src/                         ← Development source files
│   ├── js-modules/
│   ├── scss/
│   └── templates/
│
├── dist/                        ← Build output folder (empty for now)
└── _audit/                      ← Development-only folder (local logs/reports)
```

---

## 🧩 Dependencies
- None — pure HTML, CSS, and vanilla JavaScript.
- Optional serverless functions run on Netlify (no external Node dependencies).

---

## 📜 File Roles Summary

| File / Folder | Purpose |
|----------------|----------|
| **index.html** | Homepage with hero banner, highlights, and carousel of winners. |
| **nominate.html** | Four-step nomination form with client-side validation and auto-save. |
| **policy.html** | Official award rules and FAQ (accordion). |
| **success.html** | Confirmation and confetti animation after successful submission. |
| **css/** | All global and modular styles, with `/components/` for feature-specific sheets. |
| **js/** | All site logic modules per spec: smooth scroll, forms, animations, dark mode, etc. |
| **assets/** | All media: images, icons (SVG), documents, and fonts. |
| **data/** | JSON datasets for forms, testimonials, and award winners. |
| **functions/** | Netlify serverless functions for PDF generation and email notifications. |
| **partials/** | HTML fragments included into main pages for header/footer consistency. |
| **src/** | Raw source code and templates for pre-processing (non-deployed). |
| **dist/** | Build output folder. Deployment target once builds are automated. |
| **_audit/** | Internal testing and reporting (not deployed). |

---

## 🧠 Development Rules

- Use **ES6+ JavaScript**, no jQuery or external libraries.  
- Keep functions modular and wrapped in `init()` methods.  
- Maintain accessibility (ARIA, keyboard navigation, focus management).  
- Respect color palette and typography.  
- Avoid global variables; use modular imports or namespaces.  
- Each JS file must handle missing dependencies gracefully.  
- Add or remove files only after updating this `CLAUDE.md`.

---

## 🪄 Deployment Notes

- Deployment target: **Netlify**.  
- Publish directory: `/rare_award/` (or `/dist/` when build process is active).  
- Exclude from deploy: `/_audit/`, `/src/`, and `/dist/` folders.  
- Ensure `_redirects` and `netlify.toml` are present at the project root.  
- Serverless functions automatically deployed from `/functions/`.  
- Environment variables stored in `.env` (not published).

---

## 🧾 Notes (Post-Audit Summary)
- ✅ Added: `.env`, `.gitignore`, `404.html`, `package.json`, `robots.txt`, `sitemap.xml`, `_redirects`.  
- ✅ Renamed `/assets/pdf/` → `/assets/documents/`.  
- ✅ Added `/assets/icons/` (SVGs).  
- ✅ Modularized CSS with `/css/components/`.  
- ✅ Added new folders: `/data/`, `/functions/`, `/partials/`, `/src/`, `/dist/`.  
- ✅ Marked `/_audit/`, `/src/`, `/dist/` as **excluded from deployment**.

---

> This `CLAUDE.md` reflects the **verified 2025-10-19** structure.  
> All future sessions (Claude or ChatGPT) can load this file to instantly recover project memory and context.
