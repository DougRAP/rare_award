# ChatGPT Project Memory — R.A.R.E. Award Website

## Purpose
Defines how **ChatGPT (Architect/Coach)** collaborates with **Claude (Coder)** and the human developer
to design, validate, and deploy the R.A.R.E. Award website.

This file parallels and cross-references:
- `CLAUDE.md` — coder’s persistent memory file.
- `Detailed Instructions for Completing R.A.R.E. Award Website.txt` — Claude’s technical spec.
- `Detailed Instructions for ChatGPT.txt` — this assistant’s operating manual.

Both assistants share the same working folder and maintain synchronized phase tracking.

---

## Roles
| Role | Description |
|------|--------------|
| **ChatGPT (Architect/Coach)** | Plans phases, reviews deliverables, ensures accessibility, manages repo structure, and updates documentation. |
| **Claude (Coder)** | Writes all code exactly to spec and acceptance criteria from `Detailed Instructions for Completing R.A.R.E. Award Website.txt`. |
| **Human Developer (Owner)** | Reviews each phase, approves merges, and deploys. |

---

## Current Phase
**Phase:** Documentation Finalization → Git / Netlify Deployment  
**Goal:** Complete documentation parity between ChatGPT and Claude; confirm repo integrity and readiness for push.

---

## Cross-References
- Whenever ChatGPT modifies docs, cross-update the same sections in:
  - `CLAUDE.md` → mirrors structural updates.
  - `Detailed Instructions for Completing R.A.R.E. Award Website.txt` → receives matching acceptance checks.
- Whenever Claude creates or updates code, ChatGPT records rationale here and in the **Change Log** below.

---

## Collaboration Protocol
1. Both assistants read their respective memory and instruction files at session start.
2. ChatGPT generates high-level plans and review prompts.
3. Claude implements per-file output only.
4. Both assistants reference **phase markers** (0–6) to stay aligned.

---

## File Map (mirrors CLAUDE.md)
- **/js/** → All 11 finalized modules (main, navigation, local-storage, form-validation, form-handler, accordion, carousel, animations, dark-mode, accessibility, print-generator).
- **/css/print.css** → Production print stylesheet.
- **/partials/** → Header, footer, meta-tags, analytics complete.
- **/functions/** → Netlify stubs implemented (`generate-pdf.js`, `send-confirmation.js`, `submit-nomination.js`).
- **/data/** → JSON datasets populated.
- **/assets/** → SVG-based logo, gradient hero background, OG/Twitter images present.

---

## Change Log
| Date | Phase | Description |
|------|--------|-------------|
| 2025-10-19 | Phase 5 | Added ChatGPT.md & Detailed Instructions for ChatGPT.txt; synchronized with Claude’s files. |
| 2025-10-18 | Phase 4 | Completed print.css, partials, data JSON, and Netlify functions. |
| 2025-10-17 | Phase 3 | Finalized accessibility.js and print-generator.js audits. |

---

## Next Tasks
- [ ] Run PowerShell audit (no empty files)
- [ ] Git init → commit baseline
- [ ] Push to GitHub
- [ ] Connect Netlify → verify build success
- [ ] Generate `Developer Handoff Summary.md` after deploy

---

## Notes
Both assistants must remain under 80 % active context usage.  
Older phases can be summarized once verified complete.  
All updates must maintain consistent cross-references with `CLAUDE.md`.

---

_End of ChatGPT.md_
