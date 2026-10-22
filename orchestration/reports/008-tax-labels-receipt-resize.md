# Task 008 — Tax labels and receipt resizing

Reviewed and verified by task 009 on 2026-10-22. The implementation was already in the working tree; no implementation changes were needed during this review. No commits made.

## Changes reviewed

- `src/lib/tax/labels.ts` and `labels.test.ts`: shared wording and tests for both pages, including regular/safe-harbour methods and annualised/actual-YTD hints.
- `src/components/domain/dashboard.tsx` and `tax-estimator.tsx`: consistent labels, explanatory hints and active payment-method badges.
- `src/lib/domain/summary.ts` and `summary.test.ts`: expose and test the active schedule method in the dashboard response.
- `src/lib/domain/demo-data.test.ts`: regression assertions distinguish the two demo balances. No tax calculation changes were made.
- `src/lib/receipts/image-plan.ts` and `image-plan.test.ts`: pure, tested size/dimension decisions and final-upload limit.
- `src/lib/receipts/client-image.ts` and `client-image.test.ts`: browser preparation, orientation option, JPEG encoding, resource cleanup and error handling.
- `src/components/domain/receipt-scanner.tsx`: await image preparation before creating the upload FormData; helpful oversized-image/HTTP 413 messages and preparation status.
- `docs/week-11-deployment.md`: document phone-photo preparation, upload headroom, supported formats and browser limitations.

## What the tax figures mean

Both pages call `taxPaymentLabels` and use these exact labels:

- **Estimated tax still owed for 2026**: estimated federal liability minus recorded payments, floored at zero. The annualised hint is “Projected annual tax minus payments made.” When annualisation is disabled, the hint explains that future earnings are excluded.
- **Payment target still due for 2026**: the selected annual payment target minus recorded payments, floored at zero. The safe-harbour hint explains that final tax may be higher; the regular hint explains that the target is 100% of estimated tax.

Badges say **Payment method: safe harbour** or **Payment method: regular estimate**. Existing calculations select the lower prior-year target when safe harbour is enabled and applicable. The demo regression confirms $19,657.84 estimated liability minus $11,850.00 payments = $7,807.84 still owed, while the $16,000.00 safe-harbour target minus those payments = $4,150.00 target still due. These figures describe different obligations and are not a calculation contradiction.

## Receipt behaviour

The scanner calls `prepareReceiptImage(file)` before upload. It decodes with `createImageBitmap(..., { imageOrientation: "from-image" })`. Files larger than 1.5 MiB or 2000 px on either edge are re-encoded as JPEG at quality 0.85, with the long edge capped at 2000 px, preserving aspect ratio without upscaling. Transparency is flattened onto white. Smaller files remain unchanged. Original photos above 5 MiB can be prepared; the final file must be at most 4,000,000 bytes. Oversized output receives cropping/retaking advice. Server limits and magic-byte checks are unchanged.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run build:local` | PASS; Prisma generation, production compilation, TypeScript and static-page generation completed. |
| `npm.cmd run lint` | PASS. |
| `npm.cmd run typecheck` | PASS. |
| `npm.cmd test` | PASS; 30 test files passed, one skipped; 289 tests passed, one skipped. |
| `git diff --check` | PASS; only Git line-ending conversion warnings. |
| `node node_modules/next/dist/bin/next start -p 3109` | Started successfully on a free port; stopped with Ctrl+C after verification. |
| `npm.cmd run smoke -- http://localhost:3109` | BLOCKED/FAIL; health returned HTTP 503 instead of 200, so the script stopped before signup/OCR/PDF steps. |

PowerShell blocked the initial `npm run build:local` invocation because `npm.ps1` execution is disabled; using `npm.cmd` resolved the command-launch issue.

## Open items and limits

- Live smoke completion remains outstanding. The configured local database is `localhost:5433/taxwise`; a direct `pg` connection reports PostgreSQL code `28000`, `role "postgres" does not exist`. Explicit IPv4 and IPv6 checks produce the same error. Supply valid local database credentials/role, restart with `APP_URL` matching the chosen smoke origin, and rerun smoke. No credentials, database roles or configuration were changed.
- The smoke failure is an environment blocker; it does not establish whether the remaining live journey passes. The script created no account or domain fixtures because health failed first.
- Browser canvas/EXIF handling was reviewed and covered with mocked browser API unit tests; no live phone-photo/browser verification or hosted Vercel verification was performed.
- Pre-existing `AGENTS.md`/`CLAUDE.md` changes were outside task 008 and left untouched.
