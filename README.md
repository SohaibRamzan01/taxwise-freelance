# TaxWise Freelance

A workspace for freelancers to organize business expenses, track income, invoice clients,
and plan US federal quarterly taxes. This scaffold provides authentication, a complete
product database schema, and responsive pages. Domain pages are placeholders for later tasks.

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
| `GEMINI_API_KEY` | Optional, reserved for future expense categorization. |
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
  Invoice numbers are unique per user. Allocate `nextInvoiceNumber` transactionally in
  future invoice handlers. Money uses integer cents (`Int`, maximum $21,474,836.47 per field);
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

Tax estimates are for planning purposes and are not tax advice. The tax engine and
domain CRUD are intentionally left for subsequent tasks.
