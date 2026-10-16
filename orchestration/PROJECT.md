# TaxWise Freelance — Project Spec

Project ID PTUT-PRJ-042 (FinTech, Personal Wealth & Micro-Finance). 12-week academic FYP; this repo
delivers all weeks' engineering artefacts: docs (weeks 1–4), app (weeks 5–9), tests/security (10), CI + deploy (11).

## Problem
Freelancers, independent contractors and remote workers struggle to track tax-deductible business
expenses and to calculate quarterly estimated tax liabilities. They juggle spreadsheets, miss deductions,
under/over-pay quarterly estimates, and invoice clients in separate tools.

## Product: automated tax deductions & invoicing platform
### Core MVP features (the "5 core features")
1. **Expense tracking & deduction categorisation** — record expenses (date, vendor, amount, category, notes,
   business-use %, payment method). Categories map to IRS Schedule C lines (Advertising, Car & truck,
   Contract labor, Insurance, Legal & professional, Office expense, Rent/lease, Supplies, Travel, Meals (50%
   deductible), Utilities, Software & subscriptions, Home office, Education, Other). Deductible amount =
   amount × business-use % × category deductibility factor.
2. **Income tracking** — manual income entries + automatic income when an invoice is marked paid.
3. **Quarterly tax estimator** — computes YTD and annualised: net SE profit, self-employment tax, half-SE
   deduction, QBI deduction (simplified 20%, below-threshold), standard deduction, federal income tax by
   bracket, total liability, per-quarter estimated payment with safe-harbour option (100% / 110% of prior-year
   tax if prior AGI > $150k), amounts already paid, and next due date. Users log estimated payments made.
4. **Invoicing** — clients CRUD; invoices with line items, tax/discount, auto numbering per user, statuses
   DRAFT/SENT/PAID/OVERDUE/VOID, due dates, printable invoice view (print CSS → "Save as PDF").
5. **Dashboard** — KPIs (YTD income, expenses, deductions, estimated tax owed, next payment due), charts
   (monthly income vs expenses, deductions by category), outstanding invoices, upcoming deadlines.

### Secondary (week 8–9)
- AI expense categorisation via Google Gemini (`GEMINI_API_KEY`); deterministic keyword fallback when key
  missing or API fails/times out. Never block the user on AI.
- Search, filtering (date range, category, status), sorting, pagination on lists.
- Batch operations: multi-select delete / re-categorise expenses; CSV import & export of expenses.
- Admin portal (`/admin`) protected by RBAC (role USER | ADMIN): users list (activate/deactivate, change role),
  platform analytics charts (signups over time, totals of invoices/expenses, active users), audit log viewer.
- Toast notifications, responsive mobile layout, empty/loading/error states.
- User settings: filing status (single / married filing jointly / head of household), tax year, prior-year
  total tax & AGI (safe harbour), business name/address/currency for invoices.

## Tax rules (tax year 2026, US federal, store as versioned data in `src/lib/tax/rules/2026.ts`)
- Standard deduction: single $16,100; MFJ $32,200; HoH $24,150.
- Brackets single: 10% ≤12,400; 12% ≤50,400; 22% ≤105,700; 24% ≤201,775; 32% ≤256,225; 35% ≤640,600; 37% above.
- Brackets MFJ: 10% ≤24,800; 12% ≤100,800; 22% ≤211,400; 24% ≤403,550; 32% ≤512,450; 35% ≤768,700; 37% above.
- Brackets HoH: 10% ≤17,700; 12% ≤67,450; 22% ≤105,700; 24% ≤201,750; 32% ≤256,200; 35% ≤640,600; 37% above.
- SE tax: net earnings × 92.35%; 12.4% Social Security up to wage base $184,500; 2.9% Medicare uncapped;
  additional 0.9% Medicare above $200k (single/HoH) / $250k (MFJ). Deduct half of SE tax (excl. additional Medicare).
- QBI: 20% of qualified business income (net profit − half SE tax), limited to 20% of taxable income before QBI.
- Quarterly due dates 2026: Apr 15 2026, Jun 15 2026, Sep 15 2026, Jan 15 2027.
- The engine must be pure functions (no DB/IO), jurisdiction/year pluggable, money handled in integer cents.
- UI shows a clear disclaimer: estimates for planning, not tax advice.

## Stack & architecture
- **Next.js (App Router) + TypeScript** — React client + Route Handlers / server actions as API tier (3-tier:
  client → API server → PostgreSQL). Tailwind CSS. Recharts for charts.
- **PostgreSQL (Neon serverless in production, Docker postgres locally)** via **Prisma ORM** + migrations.
- **Auth**: email + password, bcrypt (cost 12) hashing, JWT (jose, HS256) in httpOnly Secure SameSite=Lax cookie,
  7-day expiry; middleware protects app routes. Multi-tenant: every domain row has `userId`; every query is
  scoped by the session user — no cross-tenant access possible through the API. Rate-limit login/signup.
- **Validation**: zod on every API input; consistent JSON error shape `{ error: { code, message, details? } }`.
- **Security**: security headers (CSP, HSTS, X-Frame-Options, etc.), Origin check on mutating requests, no secrets
  in code, audit log for sensitive actions (login, role change, deletes).
- **Health**: `GET /api/health` returns app + DB status.
- **Testing**: Vitest (+ coverage ≥ 70% on `src/lib`), focus on tax engine, validation, auth utils, AI fallback.
- **CI**: GitHub Actions — install, prisma generate, lint, typecheck, test with coverage, build.
- **Deploy**: Vercel (app) + Neon (DB). `DATABASE_URL` provided by Vercel/Neon integration. `prisma migrate deploy`
  runs during the Vercel build.

## Env vars (`.env.example`)
DATABASE_URL, JWT_SECRET, GEMINI_API_KEY (optional), ADMIN_EMAILS (comma list; signups with these emails become ADMIN),
APP_URL.

## Conventions
- Source under `src/`; domain logic in `src/lib/` (framework-free where possible); docs under `docs/`.
- Package manager: npm. Node 20+.
