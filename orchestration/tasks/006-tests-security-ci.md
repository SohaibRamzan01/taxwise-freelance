# Task 006 — Background jobs, automated testing, security audit, CI & deploy readiness (weeks 8, 10–11)

Read `orchestration/PROJECT.md`, `README.md`, and the existing code (tasks 002–005). Build on existing patterns.

1. **Background tasks (week 8 requirement)**: add a scheduled job endpoint `GET /api/cron/daily` protected by a
   `CRON_SECRET` bearer token (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; add `vercel.json` with a daily
   schedule — Hobby plan allows once per day). The job, as pure/testable services: (a) deletes unattached pending
   receipt scans older than 24 h (replaces the "on next scan" cleanup or complements it); (b) creates in-app
   notifications for invoices that became overdue and for estimated-tax due dates within the next 14 days;
   (c) records a job-run audit entry with counts. Add a small `Notification` model (userId, type, title, body,
   readAt, createdAt; tenant-scoped, migration) and a notifications bell/dropdown in the app shell with
   mark-as-read. Idempotent: running twice in a day must not duplicate notifications. Unit + route tests.
   Document `CRON_SECRET` in `.env.example`.
2. **Tests**: keep coverage ≥ 70% lines/branches on `src/lib/**` (thresholds enforced in vitest config). Make sure
   tenant isolation (user A cannot read/update/delete user B's data) and RBAC (non-admin gets 403 on /api/admin/*)
   are covered by tests for every resource. Add an end-to-end smoke script `scripts/smoke.mjs` (`npm run smoke --
   <baseUrl>`) that signs up a throwaway user and exercises the main journey (signup → client → invoice → mark paid
   → scan sample receipt → save expense → estimate → tax summary PDF → logout), printing PASS/FAIL per step and
   cleaning up via the API where possible — usable against localhost and production. Consolidate the existing
   ad-hoc smoke scripts into it where sensible.
3. **Security audit** — write `docs/week-10-security-testing.md` in simple, easy-to-read English: OWASP Top 10
   (2021) checklist mapped to concrete mitigations in this codebase with file references; run `npm audit` and fix
   what is fixable without breaking changes (incl. the ESLint → braces chain if a non-breaking update exists);
   document remaining items honestly; review every route handler for auth, tenant scoping, zod validation, upload
   limits and output encoding; ensure no secrets in repo; verify security headers (CSP, HSTS in prod, etc.). Run a
   static scan (e.g. `npx eslint-plugin-security` rules or `semgrep` if available offline; otherwise document
   manual review) and fix any issues found.
4. **Next.js deprecation**: rename `src/middleware.ts` → `src/proxy.ts` per Next 16 (keep tests passing, update
   imports/tests) so the build has no deprecation warning.
5. **CI**: `.github/workflows/ci.yml` on push/PR to main — Node 20 (or the version the project needs), `npm ci`,
   prisma generate, lint, typecheck, test:coverage, build:local, with a postgres service container, migrations
   applied, and dummy JWT_SECRET/CRON_SECRET. OCR integration test must pass or be skipped cleanly in CI if it needs
   resources unavailable there (prefer passing). Add CI badge to README.
6. **Deploy readiness**: ensure `npm run build` (prisma generate + migrate deploy + next build) works on Vercel with
   Neon (`DATABASE_URL` pooled; `DATABASE_URL_UNPOOLED` / direct URL for migrations if Prisma 7 config needs it —
   Vercel's Neon integration provides both). Check Tesseract worker/WASM/traineddata and PDFKit fonts are traced
   into the serverless bundle and the scan route's `maxDuration` fits Vercel Hobby limits (60 s). Add
   `docs/week-11-deployment.md` (simple English): step-by-step runbook (create Neon DB, import repo in Vercel, env
   vars, first deploy, run seed optionally, verify `/api/health`, run `npm run smoke -- https://<app>`).

Keep lint, typecheck, test, build:local passing. Report to `orchestration/reports/006-tests-security-ci.md`
including the coverage summary and `npm audit` before/after.
