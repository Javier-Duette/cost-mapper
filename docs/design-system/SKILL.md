---
name: cost-mapper-design
description: Use this skill to generate well-branded interfaces and assets for Cost-Mapper V2 (BIM 5D cost-management web app for Paraguay), either for production or throwaway prototypes/mocks. Contains the full dark-theme token system, monoline SVG icon set, NBR 15965 faceta colors, and JSX UI kit recreating the product (header, sidebar, budget table, 3D viewer, APU panel).
user-invocable: true
---

Read `README.md` first. It contains:
- Sources (codebase + the canonical 7-file spec at `cost-mapper/docs/claude-design/00..06-*.md`)
- Content fundamentals (Spanish PY voseo, no emoji, casing rules, vocabulary)
- Visual foundations (dark-only, 3-tier surface scale, single accent #0078D4, dense layout)
- Iconography (monoline 1.5px, viewBox 24, currentColor)

Then explore:
- `theme.css` — every token. Import it before anything else.
- `assets/icons/` — 37 monoline SVGs.
- `preview/` — isolated cards demonstrating each token + component.
- `ui_kits/cost-mapper-app/` — full interactive app recreation in JSX.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML files.
If working on production code, copy assets and read the rules to become an expert in designing with this system.

Key non-negotiables:
1. **Dark theme only** — no light mode.
2. **Desktop-first** — design for 1440px, support 1280px minimum.
3. **Tables are central** — optimize for density. Min 12px text. 36px row height.
4. **Sidebar is icons-only** — never add text labels to sidebar items.
5. **No emoji.** Use the SVG icon set.
6. **Single accent color** — `#0078D4`. Don't introduce a brand secondary.
7. **Spanish PY voseo** for all UI copy ("Importá", "Subí", "Tu presupuesto").

If the user invokes this skill without other guidance, ask what they want to build — a new screen, a component, a slide, or a mockup — and act as an expert designer who outputs HTML artifacts or production code depending on the need.
