# Task 002 — Scaffolding, database schema, and secure multi-tenant auth (week 5)

Read `orchestration/PROJECT.md` first. Do not touch `docs/` (another agent writes it in parallel).

Build:
1. Next.js (latest stable, App Router, TypeScript strict, `src/` dir, Tailwind, ESLint) in the repo root — scaffold
   non-interactively (do not overwrite AGENTS.md, orchestration/, .gitignore; merge .gitignore entries).
2. Prisma with PostgreSQL. Full schema for the whole product now (so later tasks don't churn it): User (role
   USER|ADMIN, isActive, filing status & tax settings, business profile fields), Client, Invoice (+ per-user unique
   number), InvoiceItem, Expense, Income (optional invoiceId), EstimatedPayment, AuditLog. Money as integer cents
   (`Int`/`BigInt` as appropriate), all domain rows have `userId` with index; add sensible composite indexes
   (userId+date, userId+status, etc.). Create the initial migration (`prisma migrate dev --create-only` style is fine
   if no DB is reachable; a local DB at `postgresql://postgres:postgres@localhost:5432/taxwise` may be available).
   `src/lib/db.ts` Prisma singleton. Seed script (`prisma/seed.ts`) creating a demo user with realistic sample
   data (clients, invoices, expenses, income) — password from env `SEED_DEMO_PASSWORD`, skip if unset.
3. Auth: `src/lib/auth/` — bcrypt (cost 12) hash/verify, JWT sign/verify with jose (HS256, `JWT_SECRET`, 7d),
   httpOnly Secure (in prod) SameSite=Lax cookie, `getSessionUser()` helper, `requireUser()` / `requireAdmin()`.
   Route handlers: POST /api/auth/signup, POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me — zod
   validated, generic error on bad credentials, deactivated users blocked, in-memory rate limiter on login/signup
   (keyed by IP+email), ADMIN_EMAILS env promotes role at signup, AuditLog entries for signup/login/logout.
   `src/middleware.ts` redirects unauthenticated users from app routes to /login and non-admins from /admin.
4. Shared API utilities: consistent error shape `{ error: { code, message, details? } }`, zod error mapping,
   same-origin check for mutating requests, security headers in next.config (CSP suitable for Next, HSTS, etc.).
5. Pages: polished landing page (`/`), `/login`, `/signup`, and an authenticated app shell (sidebar nav: Dashboard,
   Expenses, Income, Invoices, Clients, Tax Estimator, Settings; Admin link for admins) with placeholder pages.
   Clean, professional fintech look; responsive.
6. `GET /api/health` (app + DB check). `.env.example`. `package.json` scripts: dev, build (`prisma generate &&
   prisma migrate deploy && next build` — make migrate deploy skip gracefully only when DATABASE_URL is absent? no:
   keep it strict for Vercel, but add a separate `build:local` without migrate), lint, typecheck, test (vitest),
   test:coverage, db:seed. Set up Vitest with a couple of tests for auth utils.
7. README.md at root: overview, stack, local setup, env vars, scripts.

Verify: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:local` all pass. Report to
`orchestration/reports/002-scaffold-auth-schema.md`.
