# TaxWise Freelance

A workspace for freelancers to organize business expenses, track income, invoice clients,
and plan US federal quarterly taxes. Includes authenticated, tenant-scoped ledgers,
client and invoice management, a quarterly estimator, and a responsive dashboard.

Built with Next.js App Router, strict TypeScript, React, Tailwind CSS, PostgreSQL,
Prisma 7 with the PostgreSQL driver adapter, bcrypt, jose, Zod, and Vitest.

## Local setup

Use Node **20.19+, 22.12+, or 24+** and npm. Prisma requires one of those supported Node versions.
On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL`, `APP_URL`, and a random `JWT_SECRET` of at least 32 bytes.
   Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
4. Start PostgreSQL. For example:

   ```sh
   docker run --name taxwise-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=taxwise -p 5432:5432 -d postgres:17
   ```

5. Run `npx prisma generate` and `npx prisma migrate deploy`.
6. Optionally set `SEED_DEMO_PASSWORD` (12+ characters, at most 72 UTF-8 bytes), then run `npm run db:seed`.
7. Run `npm run dev`, then open <http://localhost:3000>.

The optional seed creates `demo@taxwise.example`, two clients, paid/sent invoices and
line items, manual/invoice-linked income, categorized expenses, and an estimated payment.
It skips when no password is supplied or the demo email already exists; existing accounts
and data are never overwritten.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; required for database operations and production builds. |
| `JWT_SECRET` | Random secret, at least 32 bytes. Required for signing/verifying sessions. |
| `APP_URL` | Canonical app origin, including protocol and port. Set explicitly in production; mutations require an exact matching Origin header. |
| `ADMIN_EMAILS` | Comma-separated emails, matched case-insensitively, promoted to ADMIN at signup. |
| `GEMINI_API_KEY` | Optional Gemini 2.5 Flash expense suggestions; rules fallback on errors/timeouts. |
| `SEED_DEMO_PASSWORD` | Optional demo password; seed skips if absent. Never set this in production unless deliberately seeding a demo. |

Keep `.env` private. The checked-in `.env.example` contains no credentials for deployed services.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Generate Prisma, strictly deploy migrations, then build Next.js (Vercel build command). |
| `npm run build:local` | Generate Prisma and build without applying migrations; no database required to compile. |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint (Next.js core web vitals and TypeScript rules). |
| `npm run typecheck` | Generate Prisma client and run strict TypeScript checks. |
| `npm test` | Run Vitest tests. |
| `npm run test:coverage` | Vitest with V8 coverage. |
| `npm run db:migrate` | Create/apply a development migration. |
| `npm run db:seed` | Run the optional demo seed. |

## Structure and security

- `src/app`: landing/auth pages, protected workspace, and API route handlers.
- `src/lib/auth`: bcrypt cost 12, HS256 tokens, seven-day cookie/session helpers,
  current-user/admin guards, input validation, and a bounded in-memory rate limiter.
- `src/lib/api.ts`: consistent `{ error: { code, message, details? } }` responses,
  JSON validation, payload size checks, and same-origin protection for mutations.
- `src/middleware.ts`: early JWT-based redirects; protected server layouts also reload
  the active user and current role from the database. APIs must use `requireUser()` or
  `requireAdmin()` and scope domain queries by that user's `id`.
- `prisma/schema.prisma`: all domain rows include indexed `userId`; composite foreign
  keys prevent invoices, items, and linked income from referencing another user's rows.
  Invoice numbers are unique per user. The invoice service allocates `nextInvoiceNumber`
  transactionally. Money uses integer cents (`Int`, maximum $21,474,836.47 per field);
  percentage tax rates use basis points and line-item quantities use Decimal.
- `GET /api/health`: returns app/database status; HTTP 503 when the DB is unavailable.

Auth routes: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`,
and `GET /api/auth/me`. Signup/login accept JSON and use generic login failures for unknown,
incorrect-password, and deactivated accounts. Signup accepts name, email, and password;
login accepts email and password. Successful signup/login returns a safe user projection
and sets an httpOnly, SameSite=Lax cookie (Secure in production). Logout clears it.
Successful signup, login, and authenticated logout write audit records.

The login/signup limiter allows ten attempts per IP+email+action per 15 minutes. It is
per-process and resets on restart; use a shared store before scaling across instances.
Run behind a trusted proxy that replaces `x-forwarded-for`, such as Vercel. The server
never accepts client-supplied roles. Configure trusted admin emails before signup.

Security headers are set in `next.config.ts`, including CSP, frame denial, MIME protection,
referrer/permissions policies, and production HSTS. CSP allows Next.js inline hydration
scripts and inline styles; eval and WebSockets are allowed only in development.

## Domain API and workspace

`/expenses`, `/income`, `/clients`, and `/invoices` provide searchable, paginated ledgers
with add/edit dialogs. Invoice line totals, discounts, and taxes are calculated on the
server. Draft invoices can be marked sent, then paid; sent status does not send email.
Paid invoices create exactly one linked income entry. Un-paying, voiding, or deleting an
invoice removes its linked income. Reopen a paid/void invoice before editing its contents.
`/invoices/[id]/print` provides print CSS for the browser's Save as PDF feature.

Collection endpoints: `/api/expenses`, `/api/income`, `/api/clients`, `/api/invoices`, and
`/api/estimated-payments` support GET/POST; append `/[id]` for GET/PATCH/DELETE.
All require a session; mutations also require the configured Origin header. Request
money is integer cents, dates are `YYYY-MM-DD`, invoice quantities allow four decimals,
and tax rates are integer basis points. Invoice POST accepts clientId, issueDate, dueDate,
items (`description`, `quantity`, `unitPriceCents`), discountCents, taxRateBasisPoints,
notes, and terms. PATCH also accepts status and optional paidAt (a date).
Linked income cannot be edited or deleted directly.

Lists accept `search`, `from`, `to`, `sort`, `direction=asc|desc`, `page`, and `pageSize`
(maximum 100). Expenses also accept `category`; invoices accept effective `status`;
payments accept `year` and `quarter`. Sort fields are allowlisted per entity in
`src/lib/domain/service.ts`. Responses contain `data` and `pagination`; single-record
responses contain `data`. Delete operations and their audit records share a transaction.

`GET /api/tax/estimate?year=2026&annualise=true` returns the calculation breakdown,
quarterly schedule, and recorded payments. Optional `asOf=YYYY-MM-DD` selects a historical
snapshot through today. `GET /api/dashboard` returns YTD KPIs, monthly series, category
deductions, outstanding invoices, and deadlines. `GET/PATCH /api/settings` reads/updates
the tax/business profile without exposing authentication fields.

The pure engine in `src/lib/tax` accepts versioned jurisdiction/year rule objects.
Only 2026 US federal rules and USD are currently exposed in the API and UI. Annualisation
uses inclusive elapsed UTC calendar days, capped at the full year; actual-YTD mode is
available. Round monetary lines half up to integer cents. QBI uses the simplified
below-threshold model. The regular quarterly target is 100% of projected annual tax;
when safe harbour is enabled, use the lower of this and 100%/110% of prior-year tax.
Any remainder cents go to later installments. The schedule carries prior-quarter
overpayments forward and excludes future-dated payments from paid-so-far totals.

Tax estimates are for planning purposes and are not tax advice. W-2 wages, withholding,
credits, capital gains, and state/local taxes are outside this model.

For a local live HTTP smoke test, start the app with APP_URL matching its localhost
origin and DATABASE_URL pointing to your local database, then run:

```sh
node scripts/smoke-domain.mjs
```

Set `SMOKE_APP_URL` if not using port 3000. The script creates disposable accounts,
checks signup → client → invoice → paid income → expense → estimate, then checks CRUD,
tenant isolation, validation, profile/dashboard/print routes, and delete audit records.
It removes only its own test accounts/data afterward; it refuses non-local app/database
hosts. The server and script must use the same database.

## Receipt OCR and downloadable reports

On **Expenses**, choose **Scan receipt**, then upload, drop, or photograph one JPG/PNG/WebP
image (maximum 5 MiB). The server checks magic bytes and MIME type, runs Tesseract OCR,
and suggests vendor, date, amount and category. Review and correct every field before
saving; the suggested category has an Auto badge. Missing fields remain editable.
Scanning errors never prevent manual expense entry. Download fictitious demo images
from the scanner or `public/samples/`; regenerate them with `node scripts/generate-receipts.mjs`.

OCR uses English language data bundled in `@tesseract.js-data/eng`, with no runtime
language download or external OCR service. It has a 25-second timeout and permits one
scan at a time per process. Dates default to US month/day/year; unambiguous day-first,
ISO and English month-name dates are also supported. Totals prefer grand total/amount
due/total lines; missing labels fall back to the largest plausible monetary amount.
Treat all recognized fields and keyword categories as suggestions, not verified facts.

Scanned images are stored in PostgreSQL `Receipt.image` (`bytea`) and attached to an
expense transactionally only when the user saves it. Images are private and served with
`Cache-Control: no-store`; every lookup and attachment is scoped to the session user.
Deleting an expense deletes its receipt. Cancel in the review form discards its pending
image. Closing the dialog/tab may leave an unattached scan; each user's pending scans
older than 24 hours are cleaned up on their next successful scan. At most ten pending
scans per user are retained. The categories now include Computer hardware & equipment
and Internet & phone, with business-use percentages applied at a 100% category factor.

Invoice print pages offer **Download PDF**, and invoice rows have a PDF link. **Reports**
provides year/calendar-quarter selection, an actual-earnings preview, PDF downloads and
a CSV deduction summary with matching category totals and Schedule C planning labels.
Quarter summaries are not annualised. Their period tax calculation applies annual tax
rules/deductions to that quarter alone for planning, not a quarterly filing liability.
The separate tax-year payment plan uses all YTD actual earnings and tax-year-assigned
payments through the as-of date, including next-January payments. Payments shown for a
quarter are selected by their assigned quarter, not their calendar payment date.
Hardware's line 27a is a planning mapping; actual capitalization/depreciation treatment
requires review. Only the existing 2026 US federal/USD rules are supported.

New endpoints (authenticated; mutations require the configured Origin):

- `POST /api/receipts/scan`: multipart form with exactly one `image` file; returns
  `{ data: { receiptId, vendor, date, totalCents, rawText, suggestion } }` (201).
- `GET /api/receipts/[id]`: the owner's original image. `DELETE` discards an unattached
  scan only, with a transactional audit record. Foreign/missing/attached deletes return 404.
- Expense `POST` optionally accepts `receiptId`; it must belong to the user and be unlinked.
  Expense lists expose only `{ receipt: { id } }`, never the binary image.
- `GET /api/invoices/[id]/pdf`: the owner's PDFKit invoice, including profile, client,
  line items, discount, tax, payment status, notes and terms.
- `GET /api/reports/tax-summary?year=2026&quarter=`: PDFKit tax summary. Set quarter to
  1–4 to filter a calendar quarter; omit or leave it empty for the year. Optional
  `format=json` returns the preview; `format=csv` downloads the deduction summary.

After applying migrations and starting `npm run build:local` + `npm start`, run
`node scripts/smoke-receipts-reports.mjs` against the local app/database. It exercises
three real OCR scans, attachment, private image retrieval, tenant isolation, cleanup,
PDF signatures/sizes, and matching JSON/CSV totals. It cleans up its disposable accounts.
`node scripts/render-smoke-pdfs.mjs` renders the saved PDFs for visual inspection.
Generated smoke PDFs/PNGs are under gitignored `orchestration/logs/task-004/`.
The Next build explicitly traces PDFKit fonts and Tesseract workers/WASM/language data.

## AI suggestions, data tools and administration (task 005)

Expense forms offer **Suggest category**. The server calls Gemini 2.5 Flash with a strict
JSON schema and a five-second deadline, validates the result with Zod, and returns
category, confidence (0–1), and source (`ai`/`rules`). Without a key or on provider failure,
the keyword engine supplies a suggestion. Review every category before saving. Only
vendor, description/notes and amount in USD cents are sent to Google when a key is set.
The request follows [Google's structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output).

Expenses support current-page selection, bulk deletion (including receipts), and bulk
category changes. Each batch is one tenant-scoped, all-or-nothing transaction with an
audit record. A missing or foreign ID rejects the whole batch. Expenses and income
export all matching filters/sort order independently of pagination (10,000 rows maximum;
narrow filters for larger ledgers). Formula-like text is escaped with an apostrophe.

CSV expense import accepts 1–50 rows and up to 128 KB per preview. Use unique headers:

```csv
date,vendor,amount,category,businessUsePercent,paymentMethod,notes
2026-06-01,Adobe,29.99,,100,CREDIT_CARD,Design tools
```

Date, vendor and amount (USD, up to two decimal places) are required. Other columns are
optional. Dates use YYYY-MM-DD; category and payment method use the enum codes in
`prisma/schema.prisma`. Blank categories receive suggestions (up to ten concurrent
provider calls). Preview shows physical line numbers, row errors and editable categories;
fix errors in the CSV and preview again. Commit revalidates everything server-side and
imports atomically with an audit entry. Re-importing a file creates new rows. Quoted
commas/newlines, escaped quotes, UTF-8 BOM and CRLF/LF are supported. Formula escaping
is retained as literal text when re-importing exports.

The header search returns up to five owner-scoped matches each for expenses, clients
and invoices. Results link to filtered ledgers or the invoice detail/print view.

`/admin` includes overview charts, searchable/paginated users with role and account access
controls, and an audit viewer filtered by actor, action, entity, dates or search text.
Every admin API independently reloads the active session user and requires ADMIN.
Self-demotion/deactivation is rejected. Changes and audits share a transaction; existing
sessions reload account status and role on subsequent requests. Telemetry covers twelve
Monday-based UTC weeks. Active users means enabled accounts with a login/signup (30-day
KPI or weekly chart); enabled-account counts are separate. Invoice counts/face values
include every status and are not revenue.

New endpoints (authenticated; mutations also require the configured Origin):

- `POST /api/expenses/categorize`: `{ vendor, description, amount }` (amount in cents).
- `POST /api/expenses/bulk`: `{ action: "delete", ids }` or `{ action: "categorize", ids, category }`, up to 100 unique IDs.
- `GET /api/expenses/export`, `GET /api/income/export`: existing list filters and sorting.
- `POST /api/expenses/import/preview`: `{ csv }`; `POST /api/expenses/import`: `{ rows }` using validated expense objects, excluding receipt IDs.
- `GET /api/search?q=…`: at least two characters.
- `GET /api/admin/overview`, `/api/admin/users`, `/api/admin/audit`; `PATCH /api/admin/users/[id]`: `{ role?, isActive? }`.

After building and starting the production app locally, run `node scripts/smoke-ai-admin.mjs`
for an end-to-end HTTP/database check. It creates disposable accounts, bootstraps only
its own admin fixture, verifies CSV/batch/search/admin flows and existing-session access
changes, and removes all its fixtures afterward. Both app and database must be local.
