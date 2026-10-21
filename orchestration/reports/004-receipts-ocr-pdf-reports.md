# Task 004 report — Receipts, OCR and PDF reports

Implemented the requested scope. No commits made.

## Built / changed

- Added COMPUTER_HARDWARE and INTERNET_PHONE (100% category factor, business use still applies), seed examples, and a migration for tenant-scoped receipt bytea storage with composite ownership foreign keys and size/MIME constraints.
- Added deterministic vendor/text categorisation, a pure receipt parser, bounded multipart uploads with magic-byte checks, server-side Tesseract OCR with a 25-second timeout, private image retrieval, and transactional attachment when an expense is saved. Unattached receipt deletion is audited; expense deletion cascades to its receipt.
- Added the Expenses scan/review workflow: file upload, drag/drop, mobile photo input, progress/errors/manual fallback, editable prefilled fields, Auto category badge, raw text review and receipt links.
- Added PDFKit invoice downloads and a Reports page with year/quarter selection, preview, PDF and matching deduction-summary CSV. Pure summary logic reuses the existing tax engine for category deductions, SE/QBI/federal calculations, payments and quarterly scheduling.
- Bundled English OCR data and configured Next server externals/file tracing for Tesseract worker/WASM/language files and PDFKit fonts. No additional environment variables or external OCR/storage services.
- Generated three fictitious sample PNG receipts and added repeatable generation, production smoke and local PDF-rendering scripts.

Files added/changed:

- `package.json`, `package-lock.json`, `next.config.ts`, `README.md`
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/20261022000000_receipts_categories/migration.sql`
- `src/lib/tax/categories.ts`
- `src/lib/categorize/index.ts`, `src/lib/categorize/categorize.test.ts`
- `src/lib/receipts/{parser,upload,ocr,routes}.ts` and `{parser,upload,ocr,ocr.integration,routes}.test.ts`
- `src/lib/reports/{summary,service}.ts`, `src/lib/reports/{summary,routes}.test.ts`
- `src/lib/pdf/documents.ts`, `src/lib/pdf/documents.test.ts`
- `src/lib/domain/{validation,service}.ts`, `src/lib/domain/service.test.ts`
- `src/app/api/receipts/scan/route.ts`, `src/app/api/receipts/[id]/route.ts`
- `src/app/api/invoices/[id]/pdf/route.ts`, `src/app/api/reports/tax-summary/route.ts`
- `src/components/domain/{records,receipt-scanner,reports}.tsx`, `src/components/app-shell.tsx`
- `src/app/(workspace)/reports/page.tsx`, `src/app/(workspace)/invoices/[id]/print/page.tsx`
- `src/app/globals.css`, `src/middleware.ts`
- `public/samples/{hardware,internet,meals}.png`
- `scripts/{generate-receipts,smoke-receipts-reports,render-smoke-pdfs}.mjs`
- This report.

## Verification

Final checks all passed (Windows uses `npm.cmd`):

| Command / check | Result |
| --- | --- |
| `npm.cmd run lint` | Pass, no ESLint findings. |
| `npm.cmd run typecheck` | Pass, Prisma generation and strict TypeScript. |
| `npm.cmd test` | Pass: 18 files, 170 tests, including real sample OCR, parser/categoriser cases, tenant/origin/input boundaries, timeout/resource cleanup, attachment, summaries, and PDF content/pagination regressions. |
| `npm.cmd run test:coverage` | Pass: statements 99%, branches 96.31%, functions 97.66%, lines 99.47%; all configured 70% thresholds exceeded. |
| `npm.cmd run build:local` | Pass, all new routes compiled. Existing Next middleware-to-proxy deprecation warning remains. |
| `npm.cmd exec prisma migrate deploy` | Pass against local PostgreSQL at localhost:5433; new migration applied. |
| `npm.cmd exec prisma migrate status` | Pass, schema up to date. |
| `node scripts/generate-receipts.mjs` | Pass, three PNG fixtures generated. |
| `npm.cmd start` | Production server starts successfully. |
| `node scripts/smoke-receipts-reports.mjs` | Pass against production server: all three real scans, parsed fields, expense save/receipt association, byte-for-byte retrieval, tenant isolation, cancellation/cascade cleanup, PDF/CSV/JSON downloads and workspace HTML. Disposable accounts removed. |
| `node scripts/smoke-domain.mjs` | Pass, existing domain regression smoke. Disposable accounts removed. |
| `node scripts/render-smoke-pdfs.mjs` | Pass; rendered and visually inspected invoice and summary pages locally. Sample invoice: 1 page/2,236 bytes; annual summary: 2 pages/5,157 bytes; Q2 summary: 2 pages/5,208 bytes. All begin with `%PDF` and exceed 1 KB. |
| Build trace inspection | Confirmed traineddata, worker entry point and PDFKit Helvetica font in route tracing manifests. |
| `git diff --check` | Pass; only Windows LF/CRLF conversion notices. |

The PDF render check caught a footer pagination issue during implementation; it was fixed and regression-tested before the final build/smoke run. Rendered PDFs/PNGs are in gitignored `orchestration/logs/task-004/`.

## Assumptions / limitations

- Calendar quarters filter actual income/expenses; no annualisation. Period tax applies the existing annual deductions/rules to the selected period for planning and is explicitly labelled as not a quarterly filing liability. A separate payment schedule uses full-year YTD actual earnings and all recorded tax-year payments. Payments shown for a quarter use their assigned quarter; next-January payments assigned to 2026 are included once recorded/as-of eligible.
- The existing 2026 federal/USD model is unchanged. Hardware line 27a is a planning mapping, with capitalization/depreciation review called out in UI/PDF. OCR uses English and US month-first dates unless day-first is unambiguous; all suggested fields require user review.
- One OCR operation per process, at most ten pending images per user. Cancel in the review form deletes the pending scan; closing the dialog/tab can leave it unattached. Pending scans older than 24 hours are cleaned on that user's next successful scan, not by a scheduled job.
- Production HTTP checks and local PDF visual QA completed. Browser UI visual/mobile-camera testing did not complete: browser access to localhost was rejected by the browser approval gate (permission declined); no browser workaround attempted.
- Pre-existing user changes to `AGENTS.md` and untracked `CLAUDE.md` were preserved. No deployment or commit performed; no implementation items intentionally deferred.
