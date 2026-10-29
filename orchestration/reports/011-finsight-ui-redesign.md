# Task 011 — UI redesign report

Implemented the receipt-led public landing page and the shared visual system across the existing workspace and auth screens. No routes, APIs, tax calculations, security rules, accessible labels or test IDs were removed. No commits made.

## Files changed

- `src/app/globals.css`: tokens, Tailwind mappings, typography, pills, marker, paper documents, app shell, tables, forms, dialogs, charts, notifications, toasts, skeletons, errors, responsive layouts and print rules. Shared classes apply to all workspace screens, including settings and empty/error/loading states.
- `src/app/layout.tsx`: self-hosted Bricolage Grotesque, Geist and Geist Mono via `next/font/google`; pre-paint theme restoration.
- `src/app/page.tsx`: landing navigation, original receipt/summary HTML visual, workflow, five features, security, native FAQ, CTA and disclaimer.
- `src/app/icon.svg`: navy/yellow brand icon.
- `src/components/theme-toggle.tsx`, `src/lib/theme.ts`: system-default theme, explicit light/dark toggle, guarded localStorage persistence.
- `src/components/app-shell.tsx`, `src/components/auth-page.tsx`: theme controls and themed shell/auth treatment.
- `src/lib/category-colors.ts`: complete, stable category palette and safe summary fallback.
- `src/components/domain/{dashboard,admin,records,reports,tax-estimator,expense-import}.tsx`: themed charts/tooltips, category chips, statement typography and numeric alignment.
- `src/components/global-search.tsx`: money typography in results.
- `src/app/(workspace)/invoices/[id]/print/page.tsx`: document typography/numeric alignment; black-on-white printing retained.
- `src/lib/pdf/documents.ts`: navy text and neutral rules replace old green PDF colors; layout/content unchanged.
- `src/lib/{theme,category-colors}.test.ts`: 30 tests for restoration, storage denial, effective-theme switching, palette completeness/fallback and WCAG text contrast.
- This report.

Pre-existing edits to `.gitignore`, `AGENTS.md`, `CLAUDE.md` and the task brief were left alone. The gitignored design reference was studied, not copied into the app.

## Implemented tokens

| Token | Light | Dark |
| --- | --- | --- |
| ground | `#F7F9FB` | `#0F1522` |
| paper (documents) | `#FFFFFF` | `#F2F4F8` |
| surface (app panels) | `#FFFFFF` | `#1B2540` |
| sunk | `#EEF2F6` | `#172036` |
| ink / ink-2 / ink-3 | `#14213D` / `#44506A` / `#5C6781` | `#E6EAF2` / `#AEB7C9` / `#8390A8` |
| rule / rule-2 | `#DCE2EA` / `#C5CEDA` | `#253049` / `#34405C` |
| hl / on-hl | `#F5EC4E` / `#14213D` | Same |
| out | `#C0303A` | `#FF8A8F` |
| revenue / cost / operating / excluded | `#8FEAA8` / `#FFC07A` / `#FF9FCB` / `#9FD6FF` | Same |
| error-surface | `#FFF0F0` | `#321D2A` |

Exact reference shadows:

- Light paper: `0 1px 1px rgba(20,33,61,.06),0 14px 32px -14px rgba(20,33,61,.28)`.
- Light lift: `0 2px 3px rgba(20,33,61,.08),0 22px 48px -18px rgba(20,33,61,.34)`.
- Dark paper: `0 1px 1px rgba(0,0,0,.3),0 16px 36px -14px rgba(0,0,0,.7)`.
- Dark lift: `0 2px 3px rgba(0,0,0,.35),0 24px 52px -18px rgba(0,0,0,.75)`.

Tokens map to Tailwind color utilities; fonts map to `font-sans`, `font-display`, `font-mono`; shadows map to `shadow-document` / `shadow-lifted` to avoid self-referential variables. Easing is the reference's `cubic-bezier(.23,1,.32,1)` and `cubic-bezier(.77,0,.175,1)`.

## Category mapping

| Family | Categories and colors |
| --- | --- |
| Blue / equipment | Hardware `#9FD6FF`; internet/phone `#B8E1FF`; office expense `#CDEAFF`; software/subscriptions `#89C5F0` |
| Orange / travel | Travel `#FFC07A`; car/truck `#FFD09D`; meals `#FFE0BE` |
| Pink / services | Advertising `#FF9FCB`; contract labor `#FFB6D7`; legal/professional `#FFD0E5`; education `#F28BBA` |
| Green / overhead | Insurance `#8FEAA8`; rent/lease `#A9EFBF`; supplies `#C6F5D4`; utilities `#7BD497`; home office `#B7EBC7` |
| Other | `#D8EDFF` |

Revenue bars are green. Category chips, donut segments and their legend use the same stable mapping. Labels remain visible; colors alone do not convey category or payment status.

## Decisions

- Dark app panels stay dark. Receipt/invoice documents retain light paper with their own navy text and neutral tokens.
- KPI figures use the brief's Bricolage display treatment; other amounts, dates in tables and invoice numbers use Geist Mono with tabular numerals.
- System preference is controlled by CSS until the user chooses an explicit theme. The inline head script restores valid saved choices before body paint; storage failure leaves the app usable. CSP was unchanged.
- Landing uses original TaxWise copy and clearly labeled fictional data. The sample's 100% deduction explicitly assumes 100% business use and eligibility review.
- Mobile tables retain their existing scrolling/card behavior, with additional sizing/wrapping and notification positioning. Motion honors reduced-motion preferences.

## Verification

Used `npm.cmd` because PowerShell blocks `npm.ps1` under this machine's execution policy.

| Command/check | Result |
| --- | --- |
| `npm.cmd run lint` | PASS, final run |
| `npm.cmd run typecheck` | PASS, final run |
| `npm.cmd test` | PASS: 326 passed, 1 skipped; 33 test files passed, 1 skipped |
| `npm.cmd run build:local` | PASS, final build; all 43 static pages generated |
| `npm.cmd run verify:bundle` | INCOMPLETE: all three runtime asset-trace checks passed; isolated OCR copy failed with `ENOSPC` (0 MB available; approximately 61 MB needed for copied packages) |
| `npm.cmd run start -- --port 3000` then `npm.cmd run smoke -- http://localhost:3000` | PASS: health, signup, clients, invoices, linked income, real OCR, private receipt, tax estimate, tax-summary PDF, notifications, admin denial, fixture cleanup, logout |
| HTTP-only public-page checks | PASS: `/`, `/login`, `/signup`, and a 404; theme restoration script precedes body; no runtime Google font URLs |
| Contrast tests | PASS: all text/error/placeholder tokens on ground/surface/sunk and all category/status label combinations meet 4.5:1 in both palettes |
| `git diff --check`; old palette search in `src` | PASS; no old green/teal hexes or green/emerald/teal classes remain |

Initial smoke on port 3011 correctly received the existing origin-check rejection because `.env` specifies port 3000. Rerunning against the configured port passed without changing `.env`. Smoke left its disposable user and audit entries as documented by the existing script; domain fixtures were cleaned up.

## Remaining / visual QA priorities

- Bundle verification must be rerun after disk space is available. Automatic approval review rejected removal of the rebuildable `.next/cache` directory and a process-local origin-setting command, stating only “blocked by policy.” No deletion or environment-file change was made.
- Browser use was excluded by the brief. The 390px layout, rendered text contrast, hydration appearance, theme-toggle interaction and no-flash behavior still need orchestrator browser QA; automated checks establish palette ratios and restoration logic, not rendered visual proof.
- Prioritize: receipt-paper stack and nav at 390px; long category/vendor labels; mobile search/bell/theme header with unread counts; scan/import dialogs and bulk controls; dense quarterly status badges; dark chart legends/tooltips; long invoice print content and multi-page printing; dark error/toast/skeleton states.
