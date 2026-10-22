# Task 007 report — UI QA fixes and midterm demo data

Implemented the brief and reset the demo ledger on the local PostgreSQL database
(`localhost:5433/taxwise`). No commits made.

## Before / after

| Item | Before | After |
| --- | --- | --- |
| Desktop sidebar | Fixed viewport panel; full-page captures left a white column below it. | Sticky, top-aligned, viewport-height sidebar with its own vertical scroll. The layout paints the entire left column dark; mobile retains its fixed navigation overlay. |
| Expense deductions | Amount/business-use columns, existing receipt links, no deductible column or totals. | Deductible beside Amount using the existing integer-cent engine, including the meals factor. Receipt links retained. Mobile cards label both amounts. Totals cover every matching filtered row, independently of pagination, including zero-result filters. |
| Quarterly presentation | Quarter allocations left stale historical past-due labels after later payments. | Pure `quarterlyPresentation` separates current status from the unchanged allocation schedule. Required and Paid (allocated) remain visible; statuses are Paid, Covered by later payment, Past due with the current cumulative shortfall, or Upcoming. Dashboard shows next due date, its cumulative payment target, and annual target remaining. |
| Favicon | `/favicon.ico` returned 404. | Added the existing brand's chart mark as `icon.svg` and a matching PNG-backed ICO. Login advertises the icon; both icon endpoints return 200. |
| Main demo | Two clients, two invoices, five expenses, small income/payment totals. | Four clients; 12 paid invoices January–October totaling $79,500; two SENT (one overdue as of October 22), one DRAFT, one VOID; three manual income entries totaling $2,980; 48 expenses across all 17 categories with varied business use; three matching receipt attachments; Q1–Q3 payments; complete SINGLE business/safe-harbour profile. |
| Reseeding/admin telemetry | Existing demo was always skipped; no admin/telemetry seed. | Exact `SEED_RESET_DEMO=true` transactionally replaces only the main demo's ledger/profile, preserving its ID. Default reruns skip it. Six other users have paid invoices, expenses and dated signup/login/delete audit fixtures over recent weeks. Optional independent ADMIN account uses `SEED_ADMIN_PASSWORD`. New variables and reset behavior documented. |

## Files changed

- `src/app/globals.css`
- `src/app/icon.svg`, `src/app/favicon.ico`
- `src/components/domain/records.tsx`, `dashboard.tsx`, `tax-estimator.tsx`
- `src/lib/domain/service.ts`, `service.test.ts`, `summary.ts`, `summary.test.ts`
- `src/lib/tax/engine.ts`, `engine.test.ts`
- `src/app/api/tax/estimate/route.ts`
- `prisma/seed.ts`, `prisma/demo-data.ts`
- `src/lib/domain/demo-data.test.ts`
- `.env.example`, `README.md`
- This report.

Pre-existing changes to `AGENTS.md`, `orchestration/run-task.sh`, and untracked
`CLAUDE.md` were preserved. No dependencies or schema migration added.

## Verification

| Command / check | Result |
| --- | --- |
| `npm.cmd run lint` | Final pass, no findings. |
| `npm.cmd run typecheck` | Pass: Prisma generation and strict TypeScript. Final production build also checked TypeScript after the API correction. |
| `npm.cmd test` | Final pass: 23 files, 238 tests. |
| `npm.cmd run test:coverage` | Pass: statements 99.21%, branches 96.39%, functions 98.21%, lines 99.57%; exceeds all 70% thresholds. Subsequent API-response assertion passed in the final unit run. |
| `npm.cmd run build:local` | Final pass; existing middleware-to-proxy deprecation warning remains. |
| `$env:SEED_RESET_DEMO="true"` followed by `npm.cmd run db:seed` | Pass against local DB; main demo populated and six telemetry accounts created. |
| `node orchestration/logs/task-007/verify-seed.mjs` (scratch checker, initially run as CJS) | Pass: another reset replaced main-demo child IDs, preserved its user ID, and left all other users/rows unchanged. Default and uppercase `TRUE` flags preserved data; unset passwords skipped all work. Verified counts, $82,480 income and exact receipt bytes. |
| `npm.cmd start` | Production server started for HTTP checks, then stopped after verification. |
| `node scripts/smoke-domain.mjs` | Final pass: CRUD, numbering/status/income synchronization, deductions, estimates/dashboard/profile, validation/origin checks, tenant isolation, print and audit records. |
| `node scripts/smoke-receipts-reports.mjs` | Final pass: three real OCR scans, private receipts, attachment/cleanup, invoice and annual/quarter PDFs, matching JSON/CSV totals and tenant isolation. |
| `node scripts/smoke-ai-admin.mjs` | Final pass: categorization fallback, CSV/import/export, bulk operations, search, admin telemetry/RBAC/audits and stale-session enforcement. |
| `node orchestration/logs/task-007/verify-demo-http.mjs` | Final pass: actual demo login, filtered totals across pagination, meals/empty filters, three receipt URLs, matching estimator/dashboard plans, login icon metadata, and both icon endpoints. |
| `git diff --check` | Pass; Windows line-ending conversion notices only. |

Regression tests cover the brief's $501.69 target/$450 Q2 payment: Q1 becomes
Covered by later payment and the next target/annual remainder is $51.69. Additional
cases cover partial later payments, overlapping deficits, early overpayments, zero
targets/safe harbour, future-dated payments, the due date itself, and expired schedules.
Expense tests check tenant/filter scope, pagination-independent totals and cent rounding.
Demo fixture tests verify invoice/date/status consistency, all categories, receipt values,
and the slightly short Q3 plan.

The final HTTP check initially exposed the estimate route omitting the new `plan` field;
the route and API regression assertion were corrected, then build/tests/smokes rerun.
An earlier Prisma receipt-buffer type error was corrected with an explicit `Uint8Array`;
scratch checker import lint errors were resolved by converting the checkers to ESM.

## Remaining limitations / assumptions

- Browser approval review rejected navigation to `http://localhost:3000` because the
  origin permission was declined. Desktop/mobile rendered layout, scrolling and visual
  overflow remain unverified; HTTP checks do not substitute for that visual QA.
- `SEED_ADMIN_PASSWORD` is unset locally, so `admin@taxwise.example` was correctly
  skipped. Set that variable and rerun the seed to create it. Existing smoke fixtures
  independently exercised the admin APIs; the main demo and six telemetry users persist.
- January–October is treated as the current 2026 demo year to date (October 22). No
  future November/December earnings or expenses were inserted. The dataset is fictitious.
- Main demo totals verified over HTTP: income $82,480; expenses $9,887.04; deductions
  $8,833.84. Safe-harbour target $16,000; Q1/Q2 paid, Q3 currently $150 short; next due
  January 15, 2027, with $4,150 required by that date and $4,150 remaining for the year.
  This next amount includes the existing $150 shortfall. Quarter shortfalls overlap and
  must not be added; the estimator explains this. Original allocation fields remain in
  `schedule`, while current presentation is returned separately as `plan`.
- Scratch verification scripts/snapshots and existing smoke PDF artifacts are kept under
  gitignored `orchestration/logs/`. No deployment performed.
