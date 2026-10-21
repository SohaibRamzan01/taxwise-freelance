# Task 006 — Automated testing, security audit, CI (weeks 10–11)

Read `orchestration/PROJECT.md`, `README.md`, and the existing code.

1. **Tests**: raise coverage to ≥ 70% lines/branches on `src/lib/**` (configure vitest coverage thresholds to enforce
   it). Add API-level tests for route handlers / services where feasible (mock Prisma or use a test DB when
   `DATABASE_URL` points at one), especially tenant isolation (user A cannot read/update/delete user B's data) and
   RBAC (non-admin gets 403 on /api/admin/*). Add an end-to-end smoke script `scripts/smoke.ts` (run with
   `npm run smoke -- <baseUrl>`) that signs up a throwaway user and exercises the main journey against a running app,
   printing PASS/FAIL per step — usable against localhost and production.
2. **Security audit** — write `docs/week-10-security-testing.md`: OWASP Top 10 (2021) checklist mapped to concrete
   mitigations in this codebase with file references; run `npm audit` and fix what is fixable without breaking
   changes; document remaining items; review every route handler for auth, tenant scoping, zod validation, and
   output encoding; ensure no secrets in repo; verify security headers. Fix any issues found.
3. **CI**: `.github/workflows/ci.yml` on push/PR to main — Node 20, npm ci, prisma generate, lint, typecheck,
   test:coverage, build:local (with a postgres service container and dummy JWT_SECRET). Add CI badge to README.
4. **Deploy readiness**: ensure `npm run build` (prisma generate + migrate deploy + next build) works on Vercel with
   Neon (`DATABASE_URL` pooled; add `directUrl` via `DATABASE_URL_UNPOOLED` if appropriate for Prisma migrations —
   Vercel's Neon integration provides both), add `docs/week-11-deployment.md` with deployment runbook, env var list,
   and health check verification steps.

Keep everything passing. Report to `orchestration/reports/006-tests-security-ci.md` including the coverage summary.
