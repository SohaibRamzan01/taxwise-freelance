# Task 002 — Scaffold, auth, and schema

Completed the requested scaffold without committing or modifying `docs/`.

## Built / changed

- Root setup: `package.json`, `package-lock.json`, `tsconfig.json`, `next-env.d.ts`,
  `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.mts`,
  `.gitignore` (merged), `.env.example`, and `README.md`.
  Next.js 16.4.2 (npm's stable release when scaffolded), React 19.3.1, strict TypeScript,
  Tailwind, ESLint, Prisma 7.10.1, and npm scripts including strict production migration deployment.
- Database: `prisma.config.ts`, `prisma/schema.prisma`, `prisma/seed.ts`,
  `prisma/migrations/migration_lock.toml`, and
  `prisma/migrations/20261016000000_init/migration.sql`.
  All requested models, indexed ownership/date/status fields, per-user invoice numbers,
  integer-cent money, and composite foreign keys enforcing tenant ownership.
  Optional, rerun-safe sample data includes clients, invoices/items, expenses, income, and a payment.
- Server utilities: `src/lib/db.ts`, `src/lib/api.ts`, and
  `src/lib/auth/{password,token,validation,rate-limit,session}.ts`.
  Bcrypt cost 12, seven-day HS256 sessions, protected cookies, current-user/admin guards,
  normalized/validated inputs, bounded IP+email rate limiting, origin protection, and JSON errors.
- API: `src/app/api/auth/{signup,login,logout,me}/route.ts` and
  `src/app/api/health/route.ts`; safe user projections and signup/login/logout audit records.
- UI: `src/app/{layout.tsx,page.tsx,globals.css}`, login/signup pages,
  `src/app/(workspace)/` layouts and all requested placeholder pages, plus
  `src/components/{brand,auth-page,auth-form,app-shell,placeholder-page}.tsx`.
  Responsive fintech styling, mobile navigation, auth loading/errors, admin-only navigation,
  and tax disclaimers. `src/middleware.ts` protects the requested workspace routes;
  server layouts also check active status and the current database role.
- Tests: `src/lib/api.test.ts`, `src/lib/auth/{auth,session}.test.ts`,
  `src/app/api/auth/routes.test.ts`, and `src/middleware.test.ts`.

## Verification

Commands use `npm.cmd` / `npx.cmd` because PowerShell blocks `npm.ps1` here.

- `npm.cmd run lint` — passed, no warnings in the final run.
- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — passed: 5 files, 29 tests.
- `npm.cmd run test:coverage` — passed the configured 70% thresholds;
  V8 reported 98.11% statements, 91.66% branches, 95.83% functions, 97.56% lines.
  Database singleton IO is excluded from unit coverage.
- `npm.cmd run build:local` — passed; all 17 pages generated/registered.
- `npx.cmd prisma validate`, `prisma generate`,
  `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/20261016000000_init/migration.sql`,
  and `prisma migrate deploy` — passed; initial migration applied to local PostgreSQL.
- Seed creation through Jiti — passed. `npm.cmd run db:seed` — passed on rerun
  (existing demo account skipped). Also verified skipping with an empty/unset seed password.
- `npm.cmd ci --dry-run --ignore-scripts --offline --no-audit --no-fund` — passed;
  manifest and lockfile agree.
- Production server (`npm.cmd start -- --hostname 127.0.0.1 --port 3000`) plus an inline
  Node HTTP/Prisma smoke test — passed 49 assertions: app/DB health, security headers,
  signup, protected cookie attributes, login/me/logout, workspace pages, generic credential
  failures, deactivation, stale admin claims, JSON/origin checks, rate limiting, and audit logs.
  PostgreSQL rejected cross-tenant invoice/client, item/invoice, and income/invoice links;
  per-user invoice uniqueness was checked. Temporary smoke data was removed.
- `git diff --check` — passed (Git only noted normal LF/CRLF conversion).

## Assumptions / limitations

- Port 5432 rejected the brief's default password. Local verification used the empty
  `taxwise` database on port **5433** with the supplied development credentials.
  A gitignored `.env` contains this URL and generated local JWT/demo secrets.
  Demo login: `demo@taxwise.example`; its password is `SEED_DEMO_PASSWORD` in that file.
- Initial installs encountered connection resets/idle timeouts; retries succeeded.
  `tsx` failed on the sandbox's OS-user lookup, so the seed now uses Jiti as an explicit
  development dependency. No OS or security settings were changed.
- Next.js warns that `middleware.ts` is deprecated in favor of `proxy.ts`.
  The requested `src/middleware.ts` path was retained and works in the build/live checks.
- Visual browser QA was skipped: the browser approval gate denied localhost access.
  No alternative browser route was attempted.
- Rate limiting remains in memory per process as requested; a shared store is needed
  for coordinated limits across multiple instances. Domain CRUD and the tax engine remain
  for later tasks; workspace pages are intentionally placeholders.
- Existing documentation and other orchestration tasks/reports were left intact. No commits.
