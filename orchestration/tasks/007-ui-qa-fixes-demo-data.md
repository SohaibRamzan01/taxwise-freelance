# Task 007 — Visual QA fixes + realistic demo data for the Week 7 midterm demo

The orchestrator ran a visual QA pass (headless Chrome, desktop 1366×900 and mobile 390×844, logged in as the seeded
demo user). All pages return 200 and have no horizontal overflow. Fix the issues below. Read `orchestration/PROJECT.md`
and existing code first; keep existing patterns.

1. **Sidebar height (desktop)**: on pages taller than the viewport (dashboard, tax estimator) the dark sidebar ends
   at the viewport height and the rest of the left column is white. Make the sidebar full height and sticky
   (`position: sticky; top: 0; height: 100vh;` with its own scroll if needed, or stretch the column).
2. **Expenses table must show the deductible amount** — the core feature. Add a "Deductible" column (amount ×
   business-use % × category factor, e.g. Meals 50%) next to Amount, plus a receipt indicator/link for rows that
   have a receipt. Show a small totals line under the table for the current filter (total amount, total deductible).
   Mobile card layout must include deductible too.
3. **Quarterly plan / dashboard "Tax deadlines" is confusing**: with a $450 payment allocated to Q2 and only
   $51.69 remaining overall, Q1 is still shown as "$125.42 · Past due" on the dashboard and estimator. A quarter whose
   shortfall was covered later should not be shown as an outstanding past-due amount. Keep the cumulative logic
   correct, but present it clearly: per quarter show Required, Paid (allocated), and a status — "Paid", "Covered by
   later payment", "Past due $X" (only if the *current* overall cumulative shortfall through that quarter is still
   > 0 after all payments made to date), or "Upcoming". The dashboard card should show: next due date, amount due
   for it, and total remaining for the year — not historical shortfalls. Add/adjust unit tests in the tax/summary
   layer for this presentation logic (pure function).
4. **Favicon**: the login page logs a 404 for `/favicon.ico`. Add an app icon (`src/app/icon.svg` using the existing
   brand mark) so no 404 occurs.
5. **Realistic demo data for the live midterm demo** (`prisma/seed.ts`, idempotent, still optional and rerun-safe):
   - Keep `demo@taxwise.example` (password from `SEED_DEMO_PASSWORD`), but give it a **realistic 2026 year**:
     ~10–14 paid invoices spread Jan→Oct ($2k–$9k each, 3–4 clients) so annual income ≈ $70–90k, 1–2 SENT
     (one overdue), 1 DRAFT, 1 VOID; ~40–60 expenses across all months and most categories including Computer
     hardware & equipment, Internet & phone, Travel, Software, Meals (business-use % varied, some < 100%); attach the
     three sample receipt images in `public/samples/` to matching expenses; 2–3 manual income entries; estimated
     payments for Q1–Q3 (one slightly short) so the quarterly plan has meaningful numbers; settings with business
     name/address, SINGLE filing status, prior-year tax/AGI filled.
   - Re-seeding must update/replace the demo user's data cleanly (delete that user's rows and recreate) only when an
     explicit flag is set (`SEED_RESET_DEMO=true`), otherwise skip if it exists (current behaviour).
   - Add a demo **admin** account `admin@taxwise.example` (role ADMIN, password from `SEED_ADMIN_PASSWORD`, skipped
     if unset) and a handful (5–8) of extra small demo user accounts with some activity spread over past weeks so the
     admin telemetry charts and audit log show real data. Document new env vars in `.env.example` and README.
   - Run the reset seed against the local DB so the demo account is populated.
6. Keep lint, typecheck, test, build:local passing. Run the existing smoke scripts. Report to
   `orchestration/reports/007-ui-qa-fixes-demo-data.md` with before/after notes for each item.
