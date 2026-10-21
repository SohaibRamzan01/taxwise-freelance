# Task 003 — Core business logic & vertical slice (week 6)

Read `orchestration/PROJECT.md`, `README.md`, and the existing code (scaffold, Prisma schema, auth from task 002).
Build on what exists; keep its patterns. Only change the Prisma schema if truly needed (then add a migration).

1. **Tax engine** `src/lib/tax/` — pure, framework-free, integer-cents functions implementing the 2026 US rules in
   PROJECT.md exactly (rules as versioned data in `rules/2026.ts`, engine generic over a rules object). Functions:
   deductible amount for an expense; SE tax (SS cap, Medicare, additional Medicare); federal income tax by bracket
   per filing status; QBI; full annual estimate from YTD figures (annualise by elapsed fraction of year, option to
   use actual YTD); quarterly schedule with due dates, required per-quarter payment (regular vs safe-harbour,
   whichever lower), paid so far, remaining, next due date. Export typed result objects with a line-by-line breakdown
   so the UI can explain the calculation. Thorough Vitest tests with hand-verified expected numbers.
2. **Domain services + API** (zod-validated, every query scoped to session userId, consistent error shape, audit log
   on deletes): CRUD for expenses, income, clients, invoices (with items; totals computed server-side; per-user
   sequential numbers like INV-0001; status transitions; marking PAID creates a linked Income row, un-paying removes
   it; overdue computed from due date), estimated payments. List endpoints support search, filters, sort, pagination.
   GET /api/tax/estimate?year=, GET /api/dashboard (KPIs, monthly income vs expense series, deductions by category,
   outstanding invoices, upcoming deadlines). PATCH /api/settings for tax/business profile.
3. **UI (functional, polished, responsive)**: Dashboard (KPI cards + Recharts charts), Expenses (table, add/edit
   dialog, category select, business-use %), Income, Clients, Invoices (list + editor with line items + printable
   invoice page `/invoices/[id]/print` with print CSS), Tax Estimator (breakdown table, quarterly schedule, record
   payment, disclaimer), Settings (filing status, prior-year tax/AGI, business profile). Loading/empty/error states.
4. Keep `npm run lint`, `typecheck`, `test`, `build:local` passing. If the local DB
   (`postgresql://postgres:postgres@localhost:5433/taxwise`) is reachable, run migrations + seed and smoke-test the
   API with real requests (signup → create client → invoice → mark paid → expense → estimate) and report results.

Report to `orchestration/reports/003-core-domain.md`.
