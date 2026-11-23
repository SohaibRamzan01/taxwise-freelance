# Task 013 — Interactive 3D hero + landing page redesign

Read `PRODUCT.md` and `orchestration/PROJECT.md` first. Surface: public landing page `/` (mode: Persuade).
Goal: make the landing page genuinely eye-catching and memorable, centred on an original interactive
3D hero scene, while keeping every fact, link, accessibility label and the planning-not-tax-advice
disclaimer. Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4 + plain CSS in
`src/app/globals.css`. `three` (+ `@types/three`) is already installed — use plain three.js, no
react-three-fiber, no Spline, no other new dependencies, no external network assets (CSP is `'self'`).

## Visual world (keep — this is an extension, not a rebrand)
Navy ink + highlighter yellow (`--hl #F5EC4E`) on cool paper; category colours from
`src/lib/category-colors.ts` (blue = equipment/internet, orange = travel, pink = services, green =
overhead). Fonts already loaded: Bricolage Grotesque (display, `font-display`), Geist (text),
Geist Mono (figures only). Light and dark themes via existing tokens — every new colour must be a
token in `:root` and its dark override; no raw hex inside components except in the three.js scene,
where read the CSS custom properties at runtime (getComputedStyle) and re-read on theme change
(watch `data-theme` on `<html>` with a MutationObserver plus the `prefers-color-scheme` media query).

## 1. The hero scene — "The receipt sorter" (`src/components/landing/hero-scene.tsx`, client)
An original three.js scene that tells the product story in one loop (~9 s):
- Paper receipts (thin rounded planes with a CanvasTexture: vendor name, 2–3 line items, total in a
  mono-style font drawn on canvas, fictional data e.g. "Desk & Circuit $240.00", "FiberNet $79.99",
  "Northline Rail $186.40", "Inkwell Studio $45.00") drift in from depth with gentle paper sway.
- Each receipt passes through a glowing horizontal yellow scan beam (additive plane + thin bright
  line). As it crosses, its text "lights up" (texture swap or emissive pulse) and a small category tag
  (coloured chip on the receipt) appears.
- It then flies on a smooth curve and lands on one of three or four neat category stacks
  (Hardware / Internet & phone / Travel / Services) with a subtle settle bounce; stack height grows.
- Soft studio lighting (one key directional + hemisphere), soft contact shadows under stacks (a
  blurred shadow texture plane is fine; avoid full shadow maps on every object).
- Pointer parallax: camera eases toward the pointer (max ~4° tilt), damped; on touch, no parallax.
- An HTML overlay (not in WebGL, so it is crisp and accessible) beside the scene: a small
  "Sample · deductible so far" ledger card whose total counts up as receipts land, with a
  "Sample data" label. Keep it `aria-live="off"`; the figure is decorative sample data.
Engineering requirements:
- Load the scene with `next/dynamic` (`ssr: false`) from the landing page; render a static fallback
  (the existing `ReceiptPreview` composition, restyled) first, and swap to the canvas once WebGL is
  ready — no layout shift (reserve the same box size, aspect ~ 1:1.05 desktop, shorter on mobile).
- If WebGL is unavailable, keep the static fallback.
- `prefers-reduced-motion: reduce` (reactive via `matchMedia(...).addEventListener('change')`): render
  one composed still frame (receipts already sorted, beam visible) and stop the loop.
- Pause the RAF loop when the canvas is off-screen (IntersectionObserver) or the tab is hidden.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))`, antialias on, `alpha: true` so the page
  ground shows through; resize with ResizeObserver; dispose geometries/materials/textures/renderer on
  unmount. Keep geometry cheap (planes / low-segment shapes). Target 60 fps on a laptop iGPU.
- Canvas gets `aria-hidden="true"`; the figure has an accessible description via the overlay text /
  `aria-label` ("Animated sample: receipts are scanned and sorted into deduction categories").

## 2. Landing page redesign (`src/app/page.tsx` + new components in `src/components/landing/`)
Keep: header nav (anchors, Log in, Get started, theme toggle, mobile menu), all true facts and FAQ
answers, footer, disclaimer, skip link. Rework the composition:
- **Hero**: two-column on desktop (copy left ~45%, scene right ~55%, scene allowed to bleed toward the
  right edge), stacked on mobile with the scene below the copy at ~360px tall. Bigger, tighter
  headline (Bricolage, clamp up to ~84px, tracking ≥ -0.04em, `text-wrap: balance`), the yellow
  highlighter mark on the key word animated in once (the mark sweeps left→right, clip-path) on load.
  Two CTAs (primary "Start keeping track" → /signup, secondary "See how it works"). Below the CTAs a
  short row of three factual proof points (e.g. "Tesseract OCR receipts", "2026 federal tax rules",
  "PDF tax summaries") — plain text with small lucide icons, not cards.
- **Delete every eyebrow/kicker label and the "01 / 02 / 03 / 04" section numbers** (`.eyebrow` above
  headings). Headings carry themselves.
- **How it works**: replace the three same-size cards with a sticky scroll-story on desktop (left: a
  sticky visual panel that changes between three states — receipt scan, category pick, quarterly
  estimate — as you scroll; right: the three steps as tall text blocks). On mobile it collapses to a
  simple vertical sequence with each visual inline. Pure CSS/IntersectionObserver, no GSAP.
- **Live tax preview (new, the "try it" moment)**: an interactive widget using the real pure engine
  `annualEstimate` + `rules2026` from `@/lib/tax` (call with `annualise: false`, asOf
  `"2026-12-31"`). Inputs: annual freelance income slider ($10k–$250k, step $1k), business deductions
  slider ($0–$80k), filing status segmented control (Single / Married filing jointly / Head of
  household). Output: estimated total federal tax for the year, split into self-employment tax and
  income tax, and the even quarterly payment (total / 4), formatted in USD with Geist Mono tabular
  numerals; numbers animate smoothly between values (respect reduced motion). Clear note directly
  under it: "Estimate for planning, not tax advice. US federal only; excludes state tax and credits."
  Plus a CTA "Track your real numbers" → /signup. Slider labels and outputs must be accessible
  (labelled inputs, `<output>` elements). Put the formatting/calculation glue in a small pure helper
  `src/lib/landing-estimate.ts` with unit tests `src/lib/landing-estimate.test.ts` (Vitest).
- **Features**: keep the five features' copy; present as an editorial asymmetric layout (e.g. one large
  feature with a small inline product-like illustration in HTML/CSS + the rest as a typographic list
  with category-colour strokes) — not a grid of identical icon cards.
- **Security** and **FAQ** sections: keep content, refresh layout to match.
- **Closing CTA band**: keep, make it bold (navy band, yellow mark), with the scene's motif (a few CSS
  receipt slips) as decoration.
- Scroll reveals: one subtle, consistent reveal for section content (opacity + 12px translate + slight
  blur, exponential ease-out `cubic-bezier(.23,1,.32,1)`, 600 ms), via a tiny IntersectionObserver
  client component. Content must be visible without JS (add the hidden state only after JS runs) and
  fully visible under reduced motion. The hero scene is the one big motion moment; nothing else loops.
- Theme the browser surfaces: `::selection` (yellow on navy), focus rings visible on all controls,
  custom range-input styling for the sliders in both themes.

## Bans (do not do)
Eyebrow/kicker labels above headings; section numbers; gradient text; glass/blur as decoration;
coloured thick `border-left` accents; hard offset shadows; emoji as icons; identical icon-card grids;
fake testimonials, user counts, ratings or savings claims; any wording implying tax advice.

## Acceptance
- `/` renders in light and dark, at 390px, 768px, 1280px and 1440px wide with no horizontal scroll,
  text contrast ≥ 4.5:1, all controls keyboard reachable with visible focus.
- Hero canvas animates, parallax works, pauses off-screen; reduced motion shows a still frame;
  no console errors; no hydration warnings.
- Existing tests still pass; new `landing-estimate` tests pass; `npm run lint` and `npm run typecheck`
  clean.

## Working rules for this run
Only edit files inside this project. Do not run any commands; only edit files. Do not ask questions.
Do not touch `src/lib/api.ts` or `src/lib/api.test.ts` (uncommitted work in progress), the tax engine,
APIs, Prisma, or workspace pages. At the end, list every file you created or changed.
