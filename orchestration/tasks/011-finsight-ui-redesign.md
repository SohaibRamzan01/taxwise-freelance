# Task 011 — Redesign the whole UI in the "FinSight" style + new landing page

The user supplied a design reference: `orchestration/design/finsight-reference.html` (gitignored — do NOT copy it
into the app, do NOT reuse its brand name, copy text, bank names or sample data; borrow only the visual language).
Open it and study its CSS (`<style>` blocks, ~25 KB) and markup before you start. Keep every feature, route, API,
test and behaviour of TaxWise exactly as it is — this is a visual redesign, plus a new landing page.

## 1. Design system (implement once, use everywhere)

Put the tokens as CSS custom properties in `src/app/globals.css` (and map them into the Tailwind theme so classes and
plain CSS share them). Values come from the reference:

| Token | Light | Dark |
| --- | --- | --- |
| `--ground` (page background) | `#F7F9FB` | `#0F1522` |
| `--paper` (cards/documents) | `#FFFFFF` | `#F2F4F8` for "paper" documents; use a dark surface `#172036`/`#1B2540` for app cards/panels so dark mode stays dark — decide sensibly and keep ≥ 4.5:1 text contrast |
| `--sunk` (inputs, chips, table heads) | `#EEF2F6` | `#172036` |
| `--ink` / `--ink-2` / `--ink-3` (text) | `#14213D` / `#44506A` / `#5C6781` | `#E6EAF2` / `#AEB7C9` / `#8390A8` |
| `--rule` / `--rule-2` (borders) | `#DCE2EA` / `#C5CEDA` | `#253049` / `#34405C` |
| `--hl` (highlighter yellow, the one accent) / `--on-hl` | `#F5EC4E` / `#14213D` | same |
| `--out` (money out / errors) | `#C0303A` | `#FF8A8F` |
| Category colours | revenue `#8FEAA8`, cost `#FFC07A`, operating `#FF9FCB`, excluded `#9FD6FF` | same |
| Shadows | `--shadow-paper`, `--shadow-lift` exactly as in the reference (light and dark variants) | |

- **Fonts** via `next/font/google` (self-hosted, no runtime Google request): **Bricolage Grotesque** (display:
  headings, big numbers; weight 600–800, `letter-spacing:-.03em`, `line-height:1.04`), **Geist** (body text 16–17px,
  line-height 1.6), **Geist Mono** (all money amounts, dates in tables, invoice numbers; `tabular-nums`).
- **Buttons:** pill (`border-radius:999px`, height 48px, 40px small variant). Primary = yellow `--hl` with `--on-hl`
  text and the reference's soft yellow shadow; secondary = transparent with `--rule-2` border; destructive keeps a
  red treatment. Hover/active/focus-visible states like the reference (focus ring clearly visible).
- **Marker highlight** (`.mark`): the reference's hand-drawn yellow highlight behind a word — use it sparingly
  (landing headline, page-hero keyword at most once per page).
- **Cards/panels:** reference `.paper` look (small radius ~3–6px for "documents" like invoices/receipts/reports,
  slightly larger radius for app panels is OK), `--shadow-paper`, hairline `--rule` borders.
- **Chips/badges:** pill chips on `--sunk`; invoice status badges and the quarterly status badges use the category
  colours / `--hl` / `--out` with dark text so they stay readable in both themes (never colour alone — keep the word).
- **Tables:** reference statement-table style — small uppercase-ish column headers, mono numbers right-aligned, money
  out in `--out`, generous row height, hairline rules; mobile card layout keeps working.
- **Category colour mapping** for expense categories, the deductions donut and legends: map the 17 categories onto the
  four reference hues + tints (e.g. hardware/software/internet/office → one family, travel/car/meals → another …) so
  charts look like the reference legend. Income/revenue = green.
- **Nav / app shell:** sticky top bar with the reference's translucent blurred background; sidebar on desktop
  restyled to match (ground or sunk surface, navy/ink text, active item with a yellow marker or pill), mobile menu
  keeps working. Brand mark restyled in the same spirit (keep the TaxWise name; simple, no FinSight assets).
- **Motion:** subtle, using the reference easing curves; respect `prefers-reduced-motion`.

## 2. Light + dark themes with a toggle

- Default follows `prefers-color-scheme`. A theme toggle (sun/moon icon button) in the app top bar, the landing nav and
  the auth pages sets `data-theme="light|dark"` on `<html>` and remembers it in `localStorage` (wrap in try/catch).
- No flash of the wrong theme: set the attribute before paint with a tiny inline script in `layout.tsx` (CSP already
  allows inline scripts; if you add a nonce or change CSP, keep the security tests passing).
- Recharts colours, PDF previews in the UI, focus rings, inputs, toasts, dialogs, skeletons, the notification bell
  dropdown, 404/error pages — everything must look right in BOTH themes.

## 3. New landing page at `/` (public)

Replace `src/app/page.tsx` with a FinSight-style landing page for TaxWise (logged-in users still reach the app
normally; keep links to /login and /signup). Sections, in the reference's rhythm (wide 1240px wrap, big display
headings, lots of air):
1. **Sticky nav:** brand, anchor links (How it works · Features · Security · Questions), "Log in", primary
   "Get started" (yellow pill), theme toggle.
2. **Hero:** headline with a yellow marker word, e.g. "Snap the receipt. Keep the **deduction**." (write good, honest
   copy), one-paragraph subline, primary + secondary buttons, and on the right a **receipt "paper" visual** built in
   HTML/CSS (fictional "Sample receipt" — vendor, items, total) with a category chip ("Computer hardware · 100%
   deductible") and a small tax-summary paper behind it, like the reference's statement → P&L stack. Label it
   "Sample data". Optional gentle entrance animation (reduced-motion safe).
3. **How it works** (3 steps): scan receipt (Tesseract OCR) → auto category (rules / Gemini) → quarterly estimate &
   tax-ready PDF.
4. **Features:** expenses & deductions, invoicing (paid → income), quarterly tax estimator, dashboard & PDF reports,
   CSV import/export — use the category colours as accents like the reference's "four colours" section.
5. **Security:** bcrypt, httpOnly session cookies, every record private to its owner, HTTPS, no bank login.
6. **Questions (FAQ):** accessible `<details>` accordion — is this tax advice (no, planning estimates), which tax
   rules (US federal 2026), what file types (JPG/PNG/WebP receipts, CSV), is my data private, what does it cost (free
   student project).
7. **Final call to action** + footer with the disclaimer "Estimates for planning, not tax advice."
No invented statistics, testimonials, prices or company claims.

## 4. Restyle every screen

Login, signup, dashboard (KPI cards with big Bricolage numbers, charts), expenses (table, scan-receipt dialog,
import dialog, bulk bar), income, clients, invoices list + editor, invoice print view (keep print CSS clean and
black-on-white), tax estimator (calculation table like a statement, quarterly plan), estimated payments, reports,
settings, admin (overview charts, users, audit log), notifications dropdown, toasts, confirm dialogs, loading
skeletons, empty states, 404 and error pages. Remove the old green palette everywhere (search the codebase for the
old hex values / green classes). Keep all existing accessible labels, roles and test ids.

## 5. Done when

- `npm run lint`, `typecheck`, `test` (update only tests that assert old class names/markup, never weaken
  behaviour/security tests), `build:local`, `verify:bundle` pass; `npm run smoke -- http://localhost:<port>` passes
  against `next start` (local DB `localhost:5434/taxwise` is in `.env`).
- No horizontal overflow at 390px; text contrast ≥ 4.5:1 (≥ 3:1 for large text) in both themes; the theme choice
  persists across reloads with no flash.
- Report to `orchestration/reports/011-finsight-ui-redesign.md`: files changed, token table as implemented, category
  colour mapping, decisions, commands + results, anything left. The orchestrator will do the visual QA in a browser
  (you cannot open localhost in a browser), so list the screens/states you are least sure about.
