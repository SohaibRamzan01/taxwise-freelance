# Task 004 — Receipt OCR, auto-categorisation, PDF invoices & tax-ready reports (weeks 6–8)

Read `orchestration/PROJECT.md` (note the new "Official portal specification" and "Receipts & reports" sections — they
are the source of truth), `README.md`, and the existing code from tasks 002–003. Build on existing patterns
(zod validation, tenant scoping by session userId, error shape, audit log, integer cents).

1. **Categories**: add `COMPUTER_HARDWARE` ("Computer hardware & equipment") and `INTERNET_PHONE` ("Internet & phone")
   to the expense category catalogue (100% deductible factor, business-use % still applies). Prisma migration if the
   category is an enum. Update UI selects, seed data and tests.
2. **Rules categoriser** `src/lib/categorize/`: pure, deterministic keyword engine
   `suggestCategory({ vendor, text, amount }) → { category, confidence, matchedKeyword }` covering common vendors and
   words (Dell, Apple, Lenovo, monitor, laptop → hardware; PTCL, Verizon, Comcast, Jazz, internet, broadband, mobile →
   internet & phone; Uber, Careem, airline, hotel, Airbnb → travel; Adobe, GitHub, AWS, Zoom → software; restaurant,
   cafe → meals; etc.). Thorough unit tests. (Task 005 will add Gemini on top, using this as the fallback.)
3. **Receipt OCR** `src/lib/receipts/`:
   - `tesseract.js` (Tesseract OCR) run server-side in a route handler (Node runtime). Upload endpoint
     `POST /api/receipts/scan` accepts one image (JPG/PNG/WebP, ≤ 5 MB, verify magic bytes, not just the extension),
     runs OCR with a timeout, then a **pure parser** `parseReceiptText(text)` extracts vendor (first meaningful line),
     date (common formats), total (prefer "TOTAL"/"AMOUNT DUE"/"GRAND TOTAL" lines, else largest amount) in cents, and
     returns `{ vendor, date, totalCents, rawText, suggestion }`. Never block: if OCR fails, return a clear error and
     the user can still enter the expense manually.
   - Store the receipt image (Postgres `bytea` in a `Receipt` table linked to the expense, tenant-scoped, with mime
     type and size — no external storage needed for the zero-cost deployment). `GET /api/receipts/[id]` serves it to
     the owner only.
   - Unit-test the parser with several realistic receipt texts (include messy OCR output). Add 2–3 small sample
     receipt images under `public/samples/` (generate them yourself, e.g. render text to PNG with a script) so the
     demo works, and one integration test that runs OCR on a sample if feasible within test time.
   - UI: "Scan receipt" on the Expenses page — upload/drag-drop/camera input on mobile → progress → pre-filled
     expense form (vendor, date, amount, suggested category with "auto" badge) → user confirms and saves. Show the
     receipt thumbnail/link on the expense row.
4. **PDFKit documents** `src/lib/pdf/` (use `pdfkit`, Node runtime):
   - `GET /api/invoices/[id]/pdf` → professional invoice PDF (business profile, client, items, totals, status).
     "Download PDF" button on the invoice page.
   - `GET /api/reports/tax-summary?year=2026&quarter=` → **tax-ready summary report** PDF: header with user/business
     and period; income total; expenses and deductible amounts grouped by category (with Schedule C line labels);
     net profit; SE tax, QBI, taxable income, estimated federal tax (from the existing tax engine); estimated payments
     made and remaining; quarterly schedule; disclaimer. New **Reports** page in the app (nav item) to choose year /
     quarter, preview key numbers, and download the PDF. Also offer CSV of the same deduction summary.
   - Keep the summary-building logic as a pure function (`buildTaxSummary(...)`) with unit tests; the PDF layer only
     renders it.
5. Make sure the Next.js build handles these server-only packages (e.g. `serverExternalPackages` for tesseract.js /
   pdfkit, and font files PDFKit needs) and that they work under `npm run build:local` + `npm start`.
6. Keep `npm run lint`, `typecheck`, `test`, `build:local` passing. If the local DB is reachable, run migrations and
   smoke-test: upload a sample receipt → parsed fields → save expense → download invoice PDF and tax summary PDF
   (check they are valid PDFs, e.g. start with `%PDF` and have >1 KB). Report results honestly.

Report to `orchestration/reports/004-receipts-ocr-pdf-reports.md`.
