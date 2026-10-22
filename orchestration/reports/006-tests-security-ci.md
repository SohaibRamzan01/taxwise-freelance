# Task 006 report — tests, background jobs, security and CI

Implemented task 006. No commit made. Existing task-007/demo/UI edits were preserved.

## Built / changed

- `src/lib/jobs/{plan,service,routes}.ts`, `src/app/api/cron/daily/route.ts`, `vercel.json`:
  daily bearer-protected job, pure UTC reminder planning, expired pending-scan cleanup,
  overdue-invoice/tax-deadline reminders, transactional count audits, advisory locking
  and unique owner/event keys for retry/concurrency safety.
- `prisma/schema.prisma`, `prisma/migrations/20261023000000_notifications/migration.sql`:
  tenant-owned Notification model/indexes; nullable audit actor for system jobs.
- `src/lib/notifications/routes.ts`, `src/app/api/notifications/route.ts`,
  `src/app/api/notifications/[id]/route.ts`, `src/components/notification-bell.tsx`,
  `src/components/app-shell.tsx`, `src/app/globals.css`: shell bell/dropdown, unread count,
  review links, error/loading/empty states and owner-only mark-as-read preserving first read time.
- `src/components/domain/admin.tsx`: show “System job” for audit entries without a user actor.
- `src/lib/jobs/jobs.test.ts`, `src/lib/jobs/database.integration.test.ts`,
  `src/lib/notifications/routes.test.ts`, `src/lib/domain/service.test.ts`:
  new job/notification tests and expanded foreign read/update/delete + route tests for
  every CRUD resource. Existing receipt/report/data/profile/admin suites cover other boundaries.
- `src/lib/api.ts`, `src/lib/api.test.ts`: cap JSON while streaming, cancel oversized input,
  test false/missing Content-Length and UTF-8 byte limits.
- `src/lib/money.ts`, `src/lib/money.test.ts`, `src/lib/receipts/parser.ts`,
  `src/lib/receipts/parser.test.ts`: bounded money/OCR numeric regexes and adversarial/boundary tests.
- Renamed `src/middleware.ts` / its test to `src/proxy.ts` / `src/proxy.test.ts`, including export/import names.
- `scripts/smoke.mjs`: canonical HTTP-only localhost/production journey, real OCR/PDF,
  PASS/FAIL per step, non-admin checks, reverse-order API cleanup and logout.
  Older specialist local/database smoke scripts are retained for their deeper checks.
- `scripts/verify-server-bundle.mjs`, `src/security.test.ts`: generated route-trace asset
  assertions and security-header/deployment-config tests. Existing tracing and scan maxDuration=60 verified.
- `.github/workflows/ci.yml`: main push/PR, Node 22, PostgreSQL 17, npm ci, generation,
  migrations, lint, types, coverage (including real DB job test/OCR), build:local, bundle check,
  and production HTTP smoke. `README.md`: badge, scripts/env/job/API documentation.
- `prisma.config.ts`, `.env.example`: direct Neon migration URL fallback and CRON_SECRET.
- `eslint.security.config.mjs`, `package.json`, `package-lock.json`: security scanner and smoke/bundle scripts.
- `docs/week-10-security-testing.md`, `docs/week-11-deployment.md`: OWASP mapping, complete API
  route review, audit/static-scan triage and simple Neon/Vercel deployment runbook.

Existing Vitest thresholds already enforce >=70% lines/branches/statements/functions over src/lib;
they were retained. Database connection glue and test files remain excluded.

## Verification

Local runtime: Node 25.8.0; CI pins supported Node 22. PostgreSQL was available locally on port 5433.

| Command / check | Result |
| --- | --- |
| `npm.cmd run lint` | PASS, no warnings/errors. |
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd test` | PASS: 269 passed, 1 clean skip (opt-in PostgreSQL job test); 28 files. |
| `npm.cmd run test:coverage` with `RUN_DATABASE_TESTS=true` on an isolated `_test` DB | PASS: all 270 tests / 28 files, including real PostgreSQL concurrency and real bundled Tesseract OCR. |
| `npm.cmd exec prisma migrate deploy` | PASS on local dev DB; notifications migration applied. Also passed from an empty isolated test DB during production build. |
| `npm.cmd run build` | PASS: generation + all migrations + production Next build against the isolated DB. No middleware deprecation warning. |
| `npm.cmd run build:local` | PASS; generation and production compilation. |
| `npm.cmd run verify:bundle` | PASS: OCR worker JS/WASM/English traineddata and PDFKit Helvetica/Helvetica-Bold fonts in actual route trace manifests. |
| `npm.cmd run smoke -- http://localhost:3006` against `next start` | PASS: health, signup, client, invoice, paid income, real OCR, attached expense/private image, estimate, tax PDF, notifications/admin denial, API cleanup, logout. |
| Live production header / cron HTTP checks | PASS: CSP/HSTS/frame denial/nosniff; unauthenticated cron 401, bearer cron 200, repeat creates no duplicates. |
| `npm.cmd run lint:security` | Exit 0; 0 errors, 27 manually reviewed warnings. No security rules disabled; full triage in week 10 doc. |
| Source/config common-credential-pattern scan; ignored-env review; `git diff --check` | PASS; no real credentials found, only `.env.example` tracked; no whitespace errors. |

Coverage for `src/lib` (enabled PostgreSQL integration run):

| Metric | Result |
| --- | --- |
| Lines | **99.60%** (756/759) |
| Branches | **96.37%** (664/689) |
| Statements | 99.26% (1076/1084) |
| Functions | 98.30% (232/236) |

Audit before/after:

| Command | Result |
| --- | --- |
| Initial `npm.cmd audit --json` | **5 high**, 0 other severities. |
| `npm.cmd audit fix --ignore-scripts` | No compatible fix available; no forced breaking changes applied. |
| Final `npm.cmd audit --json` | **5 high**, 0 other severities. |
| Final `npm.cmd audit --omit=dev --json` | **0 vulnerabilities**. |

All five remaining entries trace to braces 3.0.3 through the Next ESLint tooling chain.
`npm view braces version` returns 3.0.3; npm proposes a breaking eslint-config-next downgrade
to 14.2.35. Kept Next 16's matching lint stack and documented the unresolved advisory.

Detailed local logs are gitignored under `orchestration/logs/006-*`, notably
`006-local-verification.log`, final lint/type logs, audit JSON and security-scan output.

## Assumptions / limitations / open items

- Reminder frequency is once per invoice/due-date event and once per tax year/quarter,
  including after mark-as-read. Missed overdue invoices catch up. Tax reminders indicate
  upcoming dates, regardless of recorded payments; they link to the plan for review.
  Only active accounts receive reminders and only existing 2026 rules are supported.
- System audits use null `userId`; other audit creation and tenant data remain unchanged.
- Smoke uses no database credentials and cleans domain records via API. The disposable
  user/audit records remain because the app has no account-delete API.
- Vercel/Neon provisioning, hosted smoke and an actual GitHub Actions run were not performed.
  Their equivalent local commands passed; the deployment runbook lists hosted verification steps.
- Vercel's 4.5 MB request/response limit is below the self-hosted 5 MiB image allowance.
  The runbook explains the effective hosted limit; a direct-storage upload redesign is outside scope.
- Local verification's final `DROP DATABASE` failed with PostgreSQL **“checkpoint request failed”**,
  after all build/test/smoke/HTTP checks passed. Retrying left the disposable database
  `taxwise_006_1792633503409_test` marked invalid; it cannot be connected to for further fixture cleanup.
  The HTTP smoke's domain records had already been deleted, and integration account fixtures cleaned up.
  The verification harness therefore exited nonzero during database teardown, not during app checks.
  No repair/restart of the existing shared local PostgreSQL instance was attempted. An operator can
  remove that invalid test database after resolving the server's checkpoint problem.
