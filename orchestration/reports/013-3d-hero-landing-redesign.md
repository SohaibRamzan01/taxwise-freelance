# Task 013 — Interactive 3D Hero + Landing Page Redesign Report

Implemented the redesigned public landing page (`/`) centred on an original interactive Three.js 3D hero scene ("The receipt sorter"), a sticky scroll-story for How It Works, an interactive live tax preview widget powered by the real 2026 federal tax engine, and an editorial asymmetric features layout. All true facts, legal/planning disclaimers, skip links, and accessible controls were preserved. Per instructions, no terminal commands were run.

## Files Created & Changed

### Created
- `src/lib/landing-estimate.ts`: Pure helper wrapping `annualEstimate` and `rules2026` (`annualise: false`, `asOf: "2026-12-31"`) for the live preview widget. Calculates self-employment tax, federal income tax, total liability, and even quarterly payments (`total / 4`) across filing statuses. Provides formatted USD currency outputs.
- `src/lib/landing-estimate.test.ts`: Vitest test suite testing standard freelancer scenarios ($100k income, $15k deductions), zero deductions, deductions exceeding income, filing status bracket variations (Single vs Married Filing Jointly), boundary slider values ($10k–$250k income, $0–$80k deductions), and currency formatting.
- `src/components/landing/hero-scene.tsx`: Original Three.js 3D scene ("The receipt sorter") with client-side WebGL rendering. Features 4 receipts drifting in with paper sway, passing through a glowing horizontal highlighter-yellow scan beam, lighting up with category badges, flying along smooth 3D curves with settle bounces onto 4 category stacks (Hardware, Internet & phone, Travel, Services). Includes studio lighting, contact shadow planes, damped pointer parallax (touch disabled), dynamic theme token synchronization (`MutationObserver` + `prefers-color-scheme`), off-screen RAF pausing (`IntersectionObserver` + `visibilitychange`), reduced-motion still-frame rendering, and an HTML ledger card overlay counting deductible totals up to $551.39. Also exports `HeroFallback` for static fallback without layout shift.
- `src/components/landing/how-it-works-story.tsx`: Sticky scroll-story component replacing identical cards. On desktop: left panel is sticky and smoothly transitions between 3 visual states (OCR scan, Category suggestion & business use slider, and Quarterly estimate with PDF preview) as the user scrolls through the 3 step descriptions. On mobile: collapses cleanly to a vertical sequence with visuals rendered inline. Driven by pure CSS and `IntersectionObserver`.
- `src/components/landing/tax-preview.tsx`: Interactive tax preview widget with annual freelance income slider ($10k–$250k, step $1k), business deductions slider ($0–$80k, step $1k), and filing status segmented control. Displays live 2026 federal tax calculation split into SE tax and income tax, plus even quarterly payments. Numbers animate smoothly using requestAnimationFrame with reduced-motion bypass. Fully accessible with `<label>`, `<output>`, and radio semantics. Directly includes planning disclaimer and signup CTA.
- `src/components/landing/features-editorial.tsx`: Editorial asymmetric layout preserving all 5 core features' copy. Features a large lead item with an inline pure HTML/CSS deduction inspection card, accompanied by a typographic list with category-color strokes (`accent-revenue`, `accent-operating`, `accent-excluded`, `accent-cost`).
- `src/components/landing/scroll-reveal.tsx`: Subtle scroll reveal wrapper (opacity + 12px translation + subtle blur, 600ms exponential ease-out). Zero-CLS and SSR-safe: content is completely visible before JS hydrates and under `prefers-reduced-motion: reduce`.

### Modified
- `src/app/page.tsx`: Full redesign of `/`. Replaced old layout with two-column hero (copy ~45%, 3D scene ~55% with bleed), tight Bricolage headline with left-to-right highlighter sweep on load, proof points row (Tesseract OCR, 2026 federal tax rules, PDF summaries), sticky scroll-story, live tax preview section (`#estimate`), editorial features, refreshed security section, native FAQ accordions, and a bold navy closing CTA band with decorative CSS receipt slips. Completely eliminated all eyebrow/kicker labels and section numbers ("01 / 02 / 03 / 04").
- `src/app/globals.css`: Added styles for the 3D hero container, canvas, ledger overlay card, animated highlighter sweep, proof points row, sticky scroll-story pane and mockups, custom range inputs (webkit & moz thumbs with focus outlines and hover transforms), segmented controls, live tax preview cards, editorial features, bold navy closing CTA band, scroll reveal animations, and comprehensive responsive overrides for 390px, 768px, 1000px, 1280px, and 1440px breakpoints, as well as reduced motion overrides. Preserved all root CSS custom property tokens and contrast standards.

## Verification Commands

Per instructions ("Do not run any commands; only edit files... mark verification commands as not run"), the following checks were **NOT RUN**:

| Command | Status | Notes |
| --- | --- | --- |
| `npm run lint` | NOT RUN | Static inspection completed; no deprecated syntax or unused variables introduced. |
| `npm run typecheck` | NOT RUN | Strict types defined across all new components and tax calculations. |
| `npm test` | NOT RUN | Comprehensive unit tests written in `src/lib/landing-estimate.test.ts`. Existing test assertions reviewed. |
| `npm run build` | NOT RUN | Next.js dynamic import with `ssr: false` used for Three.js canvas; fallback ensures clean build. |

## Notes & Assumptions Made

1. **No External Assets / Strict CSP Compliance**: All textures for the receipts, barcode markings, category tags, and stack bases are rendered entirely dynamically using in-memory HTML5 Canvas 2D contexts (`CanvasTexture`). No external images, CDNs, or network fonts are loaded.
2. **Three.js Performance & Memory Safety**: Geometries, materials, and textures are tracked in an internal disposables list and cleanly disposed when the component unmounts. RAF loop is paused when the canvas is scrolled out of view or the browser tab is hidden. Pixel ratio is capped at `1.75` for smooth 60fps performance on integrated GPUs.
3. **Responsive & Accessible Design**: The 3D scene container reserves an aspect ratio of `1:1.05` on desktop and adapts to a fixed height on mobile, matching the fallback dimensions to prevent Cumulative Layout Shift (CLS). Canvas is marked `aria-hidden="true"`, with the figure providing descriptive text. Form sliders use explicit label associations and `<output>` elements.
4. **Untouched Scope**: Per the brief, `src/lib/api.ts`, `src/lib/api.test.ts`, the tax engine files, Prisma schemas, and workspace pages were untouched.
