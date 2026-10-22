# Week 11: deploy to Vercel and Neon

This runbook prepares a production deployment. No hosted project was created as part of task 006.
Use a separate preview database so preview builds do not migrate production data.

## 1. Create the database

1. Create a Neon project and PostgreSQL database. Choose a region near your Vercel function region.
2. In Connect, copy both PostgreSQL URLs: the pooled hostname (contains `-pooler`) and the direct hostname.
3. Keep TLS options from Neon. Store URLs in private environment settings, never in Git.

The app uses `DATABASE_URL` through the PostgreSQL Prisma adapter in `src/lib/db.ts`.
Prisma CLI uses `DATABASE_URL_UNPOOLED`, falling back to DATABASE_URL for local databases
(`prisma.config.ts`). This follows [Neon's Prisma 7 connection guidance](https://neon.com/docs/guides/prisma).

## 2. Import the repo

1. In Vercel, import `SohaibRamzan01/taxwise-freelance` from GitHub.
2. Keep the repository root and Next.js framework preset. Select Node **22.x** (CI also uses 22).
3. Use `npm ci` for install and `npm run build` for the build command. Keep Next's default output directory.
4. Before the first build, connect Neon through Vercel's integration or enter the two URLs manually.
   Verify their exact names and the environment selected; integration defaults can differ.

`npm run build` runs `prisma generate`, `prisma migrate deploy`, then `next build`.
A migration error stops the deployment. Do not substitute `migrate dev` or `db push` for production migrations.
The checked-in migrations include notifications and allow system job audit entries without a user actor.

## 3. Set environment variables

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL; used at runtime. |
| `DATABASE_URL_UNPOOLED` | Direct URL for the same database; used by Prisma CLI migrations. |
| `JWT_SECRET` | New random secret with at least 32 bytes. |
| `CRON_SECRET` | A second, independently generated random secret for the daily job. |
| `APP_URL` | Exact canonical HTTPS origin, for example `https://your-project.vercel.app`, with no path. |
| `ADMIN_EMAILS` | Optional comma-separated trusted administrator emails. Only matching new signups get ADMIN. |
| `GEMINI_API_KEY` | Optional. Leave absent to use deterministic expense-category rules. |

Generate each secret separately on your own machine:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Do not set `RUN_DATABASE_TESTS` on the hosted app. Leave seed passwords/reset flags absent for a normal
production deployment. Set environment values for Production and, separately, the Preview environment
if used. APP_URL must match the origin used in the browser; otherwise writes return INVALID_ORIGIN.
After adding a custom domain or changing environment values, update APP_URL and redeploy.

## 4. Deploy and check the build

1. Deploy. Confirm all migrations applied and the Next build completed in Vercel's logs.
2. The build should show Proxy rather than the middleware deprecation warning (`src/proxy.ts`).
3. Locally or in CI, `npm run verify:bundle` after a build checks the actual route trace manifests:
   receipt worker JS, Tesseract WASM, bundled English traineddata, and PDFKit Helvetica fonts.
   `next.config.ts` includes those packages as external server packages and traces their assets explicitly.
4. Scan a small bundled sample on the hosted app and download an invoice/report PDF. This is the final
   confirmation that Vercel packaged and executed the assets correctly; local trace checks alone cannot prove it.

`src/app/api/receipts/scan/route.ts` sets Node runtime and `maxDuration = 60`; OCR itself times out after
25 seconds and allows one worker per process. The cron also caps duration at 60 seconds. These explicit
caps keep both within the task's Hobby budget. Review your project's current
[function limits](https://vercel.com/docs/functions/limitations) when changing workloads.

Vercel limits request/response payloads to **4.5 MB**, including multipart overhead. Phone photos in
JPG, PNG or WebP now work through the receipt scanner: before upload, the browser applies EXIF
orientation and, when a photo exceeds 1.5 MiB or 2000 px on either edge, resizes it to at most 2000 px
on the long edge and encodes JPEG at quality 0.85. Smaller photos are uploaded unchanged. The scanner
allows the final image only up to 4,000,000 bytes, leaving room for multipart headers; if it is still
too large, it asks the user to crop or retake it. A phone photo can exceed 5 MiB before preparation.
Use a browser with `createImageBitmap` support; unsupported or unreadable images receive a friendly
error with a manual-entry option. HEIC is not supported; choose JPG, PNG or WebP instead.
The server's 5 MiB limit and MIME/magic-byte checks remain unchanged. Direct API uploads and large
PDFs/private image responses remain subject to the platform limit.
[Vercel documents this limit here.](https://vercel.com/docs/functions/limitations#request-body-size)

## 5. Optional seed

Use seeding only for an intentional demo deployment. From a trusted local checkout, set DATABASE_URL
and DATABASE_URL_UNPOOLED to that demo database and set a strong SEED_DEMO_PASSWORD and/or
SEED_ADMIN_PASSWORD privately. Run:

```sh
npm ci
npm run db:seed
```

Existing accounts are skipped. `SEED_RESET_DEMO=true` replaces only the main demo account's data/profile;
use it only when that replacement is intended. Remove seed secrets/reset flags afterward.
Do not publish demonstration passwords or run a demo reset on a live customer ledger.

## 6. Verify the app

1. Visit `https://<app>/api/health`. Expect HTTP 200 with `{"app":"ok","database":"ok"}`.
   A 503 means the database configuration/connectivity needs attention.
2. From this repository, with dependencies installed, run:

   ```sh
   npm run smoke -- https://<app>
   ```

   It prints PASS/FAIL per step: signup, client, invoice, paid income, real OCR sample, reviewed expense,
   estimate, PDF, notification/admin checks, fixture cleanup, logout. It needs no database credentials.
   It exits nonzero on failure. Domain fixtures are removed through the API where possible; the printed
   throwaway account and audit records remain because there is no account-delete API. Run only against
   an app you own. Disable or configure deployment protection appropriately for this deliberate test.
3. In browser developer tools, check production CSP, HSTS, X-Frame-Options=DENY, and nosniff.
   Verify the session cookie has Secure, HttpOnly and SameSite=Lax.
4. Check a second account cannot access the first account's records. Check a normal user receives 403
   from admin endpoints. The automated suite also covers tenant isolation and current-role RBAC.

## 7. Verify the daily job and bell

`vercel.json` configures `0 6 * * *` (daily, 06:00 UTC). This meets
[Hobby's once-daily scheduling restriction](https://vercel.com/docs/cron-jobs/usage-and-pricing).
Hobby invocation can occur within that hour; do not depend on exact-minute delivery.

1. Set CRON_SECRET before deploying. In Vercel Settings → Cron Jobs, confirm `/api/cron/daily` is enabled.
2. The scheduler sends the bearer secret automatically. For a deliberate manual run, use your secret
   manager or API client to send `GET /api/cron/daily` with `Authorization: Bearer <your-secret>`.
   Do not put the secret in a URL, Git, screenshots or shared shell history.
3. Without the bearer header, expect 401 even if signed in. With it, expect day, receiptsDeleted,
   notificationsCreated and remindersChecked in the JSON response.
4. Run twice: the second run must add zero duplicate event notifications. Read reminders remain read.
5. Sign in to an account with a sent invoice whose due date has passed. Open the bell, follow Review,
   and mark the reminder as read. Check the unread count changes. Tax reminders appear from 14 days
   before a supported deadline through the deadline day; they are date reminders, not unpaid balances.
6. In the admin audit viewer, filter action `JOB_RUN` and entity `daily`; check counts and “System job”.

The transaction rolls back on failure. There is no automatic Vercel cron retry; inspect logs and rerun
after correcting a failure. Unique owner/event keys and a database advisory lock prevent duplicate
notifications on retry or overlap. The next successful run also catches overdue invoices missed earlier.
[Vercel's cron management documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs) describes
authorization, failure handling and dashboard controls.

## Troubleshooting and later releases

- INVALID_ORIGIN: use the canonical APP_URL, including HTTPS and correct hostname/port; redeploy after changing it.
- Migration failure: verify direct URL/database/permissions; inspect logs and fix the failed migration before retrying.
  Never delete migration history to bypass a production error.
- OCR missing worker/data or PDF font errors: check build traces, then run hosted smoke; do not rely on runtime downloads.
- OCR timeout/busy: try a smaller clearer image or enter the expense manually. AI failures fall back to rules.
- Before future releases, run CI and the smoke; review the remaining development-only audit chain in
  [week 10](week-10-security-testing.md). Back up the database before schema/data changes. A Vercel app rollback
  does not undo database migrations; use a compatible forward fix or a planned database restore.
