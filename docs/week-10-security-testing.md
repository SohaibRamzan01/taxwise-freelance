# Week 10: security and testing

Reviewed on 22 October 2026. This is a code review and test record, not a penetration-test certification.
The checklist follows [OWASP Top 10 (2021)](https://top10.owasp.org/2021/).

## OWASP checklist

| Risk | Concrete controls and evidence | Limits or follow-up |
| --- | --- | --- |
| A01 Broken Access Control | `src/lib/auth/session.ts` reloads the active user and current role. `src/lib/domain/service.ts` adds the session `userId` to reads, updates and deletes. `prisma/schema.prisma` uses tenant-aware foreign keys. `src/lib/admin/routes.ts` guards all four admin handlers. `src/lib/api.ts` checks Origin on writes. | The proxy is only an early page redirect; API and server-layout guards remain necessary. See the tenant/RBAC tests below. |
| A02 Cryptographic Failures | `src/lib/auth/password.ts` uses bcrypt cost 12. `src/lib/auth/token.ts` restricts JWT verification to HS256, issuer and audience, requires a 32-byte signing secret, and sets httpOnly/Secure-in-production/SameSite=Lax cookies. `next.config.ts` sets production HSTS. | Deploy with HTTPS and private database credentials. Receipts contain private financial information; restrict database and backup access. |
| A03 Injection | Zod schemas in `src/lib/domain/validation.ts`, `src/lib/ai/index.ts`, `src/lib/admin/service.ts` and `src/lib/data/service.ts` validate API input. Prisma binds query values; tagged SQL in domain/admin/jobs services uses fixed SQL. `src/lib/data/csv.ts` escapes spreadsheet formulas. React renders user/OCR text as text; PDFKit receives text, not HTML. | No unsafe raw SQL, eval, shell execution or `dangerouslySetInnerHTML` was found in application source. Dynamic field names come from fixed allowlists. |
| A04 Insecure Design | `src/lib/domain/service.ts` locks per-user writes and synchronizes paid invoices with one linked income. Totals are server-calculated. `src/lib/jobs/service.ts` uses a transaction and advisory lock; notification uniqueness also prevents duplicates. | The estimator remains a simplified planning tool. OCR/AI suggestions require review. Large ledgers would need paged background work. |
| A05 Security Misconfiguration | `next.config.ts` sets CSP, frame denial, nosniff, referrer/permissions policies and production HSTS, and removes the powered-by header. `src/lib/api.ts` sends no-store and generic internal errors. `src/lib/jobs/routes.ts` fails closed when CRON_SECRET is missing. | CSP still allows inline scripts/styles for Next hydration. Development additionally permits eval/WebSockets. Preview origins need their own APP_URL. |
| A06 Vulnerable and Outdated Components | `package-lock.json`, `npm ci`, CI checks and `npm audit` make dependency versions repeatable. | Five high development-tool audit entries remain; details below. Recheck when braces/Next lint dependencies release a compatible fix. |
| A07 Identification and Authentication Failures | Login checks disabled accounts and uses a dummy hash for unknown email addresses. Signup roles come only from ADMIN_EMAILS. `src/lib/auth/rate-limit.ts` bounds login/signup attempts. Session/admin tests cover stale roles and disabled users. | The limiter is per-process/IP+email+action and can be bypassed across instances or many emails. Use a shared limiter and platform abuse controls before larger public use. Logout clears the cookie; a stolen JWT remains valid until expiry unless the user is disabled or the signing key changes. |
| A08 Software and Data Integrity Failures | CI installs the lockfile, applies checked-in migrations and runs tests/build. Gemini JSON is schema-checked before use, with a deterministic fallback. Bundled OCR language data avoids runtime language downloads. | CI uses maintained version tags for GitHub actions, not immutable commit pins. Dependency integrity hashes verify downloads but do not establish publisher trust. |
| A09 Security Logging and Monitoring Failures | Auth, deletes, bulk/import and user-access changes create audit rows. Daily jobs add counts with a system actor. `src/lib/admin/service.ts` exposes logs only through admin guards. Error logs omit request bodies and secrets. | Audit rows share the primary database; they are not tamper-proof external logs. Operators must monitor failed jobs and Vercel logs; no automatic alert service is configured. |
| A10 Server Side Request Forgery | `src/lib/ai/index.ts` calls one fixed Google HTTPS endpoint. Receipts are uploaded bytes, never server-fetched user URLs. OCR uses local language assets. | `scripts/smoke.mjs` deliberately accepts an operator-supplied base origin. It is a local CLI tool, not a remotely callable URL-fetch endpoint. |

## Route-by-route review

Every `route.ts` under `src/app/api` was inspected, including its re-exported handler and service.
All state changes use `apiHandler` and exact Origin checking. GET cron is the deliberate exception:
it changes state only after checking its separate bearer secret. All authenticated JSON/image/PDF/CSV
responses use no-store. Inputs described as “none” below have no request fields to validate.

| Routes and methods | Guard, tenant boundary, validation and output |
| --- | --- |
| `auth/signup` POST | Public; Origin, size-limited JSON, signup Zod schema, rate limit, bcrypt; role ignores client input. Returns safe user fields and session cookie. |
| `auth/login` POST | Public; Origin, login schema, rate limit, generic credential failure; safe response/cookie. |
| `auth/logout` POST | Origin required; session optional so expired sessions can log out. Audit if signed in; clears cookie. No request fields. |
| `auth/me` GET | `requireUser`; safe user projection from current DB state. No request fields. |
| `health` GET | Intentionally public; fixed `SELECT 1`; app/DB status only, 503 on failure, no internal exception text. |
| `clients`, `expenses`, `income`, `invoices`, `estimated-payments` GET/POST; each `[id]` GET/PATCH/DELETE | Shared handlers in `src/lib/domain/routes.ts`: user guard, list schema or bounded ID, strict per-entity body schemas in the service. Every query/mutation uses owner ID. Foreign IDs return 404. Invoice items are reached through their owned invoice; foreign clients and receipt attachments are rejected. Deletes audit transactionally. |
| `settings` GET/PATCH | User ID comes from session only. PATCH uses strict settings schema; safe profile selection excludes credentials/role/counters. |
| `tax/estimate` GET; `dashboard` GET | User guard; estimate query validates supported year, boolean option and date. Dashboard has no request fields. All ledger/payment/profile/invoice queries are owner-scoped (`src/lib/domain/summary.ts`). |
| `receipts/scan` POST | User guard; multipart stream capped before parsing, exactly one image, matching MIME/magic bytes, maximum 5 MiB, maximum ten retained pending scans. OCR timeout 25 seconds, one worker per process. Stores owner ID; no user-provided storage path. |
| `receipts/[id]` GET/DELETE | User guard, bounded ID. Owner-only binary image with nosniff and safe fixed filename. DELETE only matches owned unattached images and audits. There is no receipt PATCH. |
| `invoices/[id]/pdf` GET | User guard, bounded ID, owner-scoped invoice/profile; PDFKit text, safe download filename. |
| `reports/tax-summary` GET | User guard, strict year/quarter/format schema; all report inputs owner-scoped. PDFKit text, JSON preview, formula-safe CSV. |
| `expenses/categorize` POST | User guard, bounded strict suggestion schema; fixed remote endpoint, response schema/timeout/fallback; no persistence of provider output without user action. |
| `expenses/bulk` POST | User guard, strict action/IDs/category schema, 100 unique IDs maximum. Scoped count must match the entire selection before any update/delete; one transaction/audit. |
| `expenses/import/preview` POST; `expenses/import` POST | User guard, JSON max 256,000 bytes. Preview CSV max 128,000 characters, header allowlist, at most 50 rows, schema validation and bounded AI concurrency. Commit revalidates strict rows and stamps owner ID; no receipt IDs. |
| `expenses/export` GET; `income/export` GET | User guard, list/filter/sort validation; owner-scoped rows, 10,000-row cap, formula-safe CSV. |
| `search` GET | User guard, strict 2–200-character query; owner-scoped results, fixed select fields, five results per resource. |
| `admin/users` GET; `admin/users/[id]` PATCH; `admin/overview` GET; `admin/audit` GET | Each independently calls `requireAdmin`. Strict filters, bounded ID and strict access-change schema. Platform-wide data is intentional for admins. Password hashes excluded. Self-demotion/deactivation blocked; changes audited. |
| `notifications` GET; `notifications/[id]` PATCH | User guard; list/count scoped to owner, at most 50 rows. Bounded ID, strict `{ read: true }` body, owner-only lookup/update. Foreign IDs return 404; repeated reads preserve first read time. |
| `cron/daily` GET | No user session accepted as authorization. Constant-time comparison of hashed bearer values; missing secret fails closed. Fixed platform-wide transaction, no caller-selected user/SQL. Audit has null user actor and aggregate counts. |

JSON limits now apply while reading the stream, including when Content-Length is missing or false
(`src/lib/api.ts`). Upload limits already applied to the stream (`src/lib/receipts/upload.ts`).
Receipt images are binary and never served as HTML/SVG. OCR text is untrusted text rendered through React.
The application limits uploaded bytes but does not preflight decoded pixel dimensions; high-resolution
or malicious images can still consume worker memory. The timeout and per-process worker limit reduce,
but do not eliminate, this resource risk. Vercel also imposes a smaller request limit (see week 11).

## Automated tests

Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`, and `npm run build:local`.
Vitest enforces 70% lines, branches, statements and functions across `src/lib/**/*.ts`, excluding test
files and `src/lib/db.ts` connection glue. Tax, validation, auth, AI fallback, CSV, OCR, PDF and route
tests all run. `src/security.test.ts` checks production/development header differences and tracing configuration.

- `src/lib/domain/service.test.ts`: reads, updates and deletes of all five resources reject foreign IDs;
  list/count predicates, invoice/client links and receipt attachment are scoped.
- `src/lib/receipts/routes.test.ts`, `src/lib/reports/routes.test.ts`, `src/lib/data/routes.test.ts`:
  private receipts/PDFs, owner-only exports/search, atomic foreign-ID batch rejection and authenticated imports.
- `src/lib/domain/summary.test.ts`: owner-only dashboard, estimate and profile queries/updates.
- `src/lib/auth/session.test.ts`, `src/lib/admin/admin.test.ts`: actual guard logic plus all four admin
  handlers reject non-admins with 403; stale JWT roles do not bypass current DB role/account status.
- `src/lib/jobs/jobs.test.ts`, `src/lib/notifications/routes.test.ts`: bearer auth, date boundaries,
  cleanup predicates, failure propagation, count audits and tenant-scoped read state.
- `src/lib/jobs/database.integration.test.ts`: real PostgreSQL concurrency/idempotence, strict 24-hour
  cutoff, attached/fresh receipt preservation, active users and eligible invoice statuses. Opt in with
  `RUN_DATABASE_TESTS=true` on a migrated database ending in `_test` or `_ci`. It skips otherwise.
- `src/lib/receipts/ocr.integration.test.ts`: real OCR of the bundled hardware sample. No network
  language download is needed. This passes in local testing and is enabled in CI.

The unified `npm run smoke -- <baseUrl>` uses only HTTP and real OCR/PDF generation. It deletes its
domain fixtures even after failures where possible and logs out. Disposable signup accounts/audits
remain because there is no account-delete API. Older local-only scripts remain for deeper diagnostics.
Exact final test counts and coverage are recorded in `orchestration/reports/006-tests-security-ci.md`.

## Dependency audit

Commands: `npm audit --json`, `npm audit fix --ignore-scripts`, `npm view braces version`,
`npm ls braces`, and `npm audit --omit=dev --json`.

| Check | Before | After compatible fixes and adding the scanner |
| --- | --- | --- |
| Full dependency tree | 5 high; 0 critical/moderate/low | 5 high; 0 critical/moderate/low |
| Production dependencies | Not separately run | 0 |

The remaining chain is `eslint-config-next@16.4.2` → `@next/eslint-plugin-next@16.4.2` →
`fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. These are five npm entries for
one underlying [braces stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The registry currently reports 3.0.3 as the latest braces version. `npm audit fix` makes no compatible
repair; npm proposes `eslint-config-next@14.2.35` with `--force`, a breaking downgrade from Next 16's
lint stack. That downgrade was not applied. This affects developer-supplied glob patterns in tooling;
the affected chain is absent from the production dependency tree. Recheck upstream updates rather
than declaring the audit clean.

## Static scan and manual triage

Installed `eslint-plugin-security` as a development dependency. Run `npm run lint:security`;
`eslint.security.config.mjs` enables its recommended rules on application source and scripts.
Tests are excluded from security rules. Ordinary Next/TypeScript lint still covers them.

The final scan reports 27 warnings and no errors. None are hidden by disabling security rules.
Each warning was reviewed:

| Locations | Result |
| --- | --- |
| `src/lib/money.ts`; `src/lib/receipts/parser.ts` (2 regex warnings) | Numeric repetitions were bounded as part of this audit. Decimal parsing accepts at most ten whole-number digits; OCR grouping is bounded. The rule still flags nested bounded groups heuristically. Tests include 100,000-digit invalid tokens, valid grouped amounts and the integer database boundary. |
| `src/lib/domain/service.ts` (4); `src/lib/domain/invoices.ts` (1) | Object keys come from typed entity/status sets and validated sort allowlists; search fields are fixed arrays. No caller-controlled prototype assignment. |
| `src/lib/tax/engine.ts` (4); `src/lib/tax/rules/2026.ts` (1) | Category/filing-status enums and fixed bracket-array positions. API schemas validate enums before these functions run. |
| `src/lib/data/csv.ts` (2); `src/lib/pdf/documents.ts` (3) | Numeric string/array indexes, not property-name writes. CSV headers are checked against a fixed list; PDF widths are fixed by the renderer. |
| `src/components/domain/records.tsx` (3); `src/components/placeholder-page.tsx` (1) | Typed page/entity configuration keys from app callers, not arbitrary request keys. |
| `scripts/render-smoke-pdfs.mjs` (2); `scripts/smoke-receipts-reports.mjs` (2); `scripts/smoke.mjs` (1); `scripts/verify-server-bundle.mjs` (1) | Filesystem paths derive from fixed local sample/output/route lists. Remote request data never selects a filesystem path. |

Separately, manual route review found that JSON size checks originally happened after buffering the
whole request. This was fixed with bounded streaming and cancellation, including tests for false
Content-Length and UTF-8 byte sizes. This is a real hardening change, unlike the reviewed array-index warnings.

## Secrets and operational limits

`.env` is ignored and only `.env.example` is tracked. Source/config review found no real credentials,
private keys or access tokens. CI credentials are explicitly disposable dummy values on its private
PostgreSQL service. Never copy local `.env` or build/log artifacts into commits. Rotate a secret if it
is ever exposed; this review cannot prove that deleted historical commits never contained one.

Production response headers were also checked over HTTP against the local production server. HTTPS,
Neon/Vercel provisioning, hosted cron scheduling and an actual hosted smoke run remain deployment
operator checks, described in `docs/week-11-deployment.md`.
