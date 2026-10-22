# Task 010 — Receipt OCR on Vercel

Implemented and verified locally. No deployment or commit made.

## Root-cause hypothesis and evidence

The previous scan route trace omitted `@tesseract.js-data/eng/package.json`, even though
`recognizeReceipt` resolves that exact file before calling `createWorker`. In a trace-only
deployment this produces an immediate `MODULE_NOT_FOUND`, consistent with the reported
~0.4-second failure. The trace also omitted `bmp-js` and `wasm-feature-detect`, both required
by the worker. Including worker source files did not recursively include their dependencies.
The strengthened verifier failed against the old build on the missing English package metadata.

The old route glob did match: worker source, core files, and compressed traineddata were present.
The fix uses the explicit `/api/receipts/scan` key and fills the actual dependency gaps.
Production causality still needs confirmation after the orchestrator deploys; no hosted logs
or hosted runtime were accessed during this task.

Inspected the installed Tesseract.js 7 Node adapter: it selects core modules internally and
ignores the supplied `corePath`. Consequently, explicit `corePath` alone cannot fix packaging;
all six core JS/WASM pairs are checked. The English npm package ships `eng.traineddata.gz`,
so `gzip: true` is intentional: a local read and in-memory decompression, with no download.
Language/image writes use WASM's virtual filesystem. Host caching is disabled, with a defensive
OS-temp cache path (`/tmp` on Vercel).

Kept the Node worker rather than adding a direct-core fallback: real recognition now succeeds
using only traced packages, with network and host writes disabled. This preserves timeout
termination and the existing worker lifecycle without introducing another recognition engine.

## Files changed

- `src/lib/receipts/ocr.ts`: explicit worker/core/language paths, cache/temp/gzip options;
  structured diagnostics for recognition failures and worker error-handler events. Public errors unchanged.
- `next.config.ts`: exact scan route includes, English metadata, and missing worker dependencies.
- `scripts/verify-server-bundle.mjs`: exact checks for 25 OCR assets and PDF fonts; copies only
  traced package files and runs real sample OCR in a child process. A require guard in both
  threads rejects dependencies outside that copy; network and host cache writes are blocked.
  Scratch files are removed afterward.
- `src/lib/db-connection.ts`, `src/lib/db.ts`: normalize runtime `sslmode=require` to
  `verify-full`, retaining certificate/hostname verification without pg's ambiguity warning.
- `src/lib/db-connection.test.ts`: URL normalization, credentials/options preservation,
  idempotence, and unchanged local/other modes.
- `src/lib/receipts/ocr.test.ts`: bundled options, structured error fields, string worker errors,
  unchanged public message, and exclusion of image/user context from diagnostics.
- `src/security.test.ts`: updated deployment assertions for the exact route and required dependencies.
- `docs/week-11-deployment.md`: runtime packaging, TLS behavior, verifier, and log troubleshooting.
- `orchestration/reports/010-ocr-on-vercel.md`: this report.

## Verification

Windows PowerShell blocks `npm.ps1`; used the equivalent `npm.cmd` commands. Local Node: 25.8.0.

| Command | Result |
| --- | --- |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS: 296 tests passed, one existing database integration test skipped; 31 files passed, one skipped |
| `npm.cmd run build:local` | PASS, including `/api/receipts/scan` |
| `npm.cmd run verify:bundle` | PASS: 25 exact OCR assets, both PDF font checks, isolated real OCR |
| `npm.cmd start` then `npm.cmd run smoke -- http://localhost:3000` | PASS: every step, including real receipt OCR, saved expense/private image, tax PDF, permissions, cleanup, logout |
| `git diff --check` | PASS, line-ending warnings only |

The first test run found an assertion expecting the former route glob; updated it. A subsequent
run alongside the build hit the existing bcrypt test's five-second timeout. The final full run,
after the build finished, passed without changing that test or its timeout.
The production server was stopped after smoke. Smoke cleaned its domain fixtures; its disposable
account `smoke-91d7538214463b90e806@example.test` and audit records remain by script design.
The configured `localhost:5434/taxwise` database connected successfully. No environment changes
or migrations were needed. Pre-existing changes to `AGENTS.md`, `CLAUDE.md`, and the task brief
were left untouched.

## Orchestrator verification on Vercel

1. Review, commit, and deploy through the existing workflow using the configured Node 22 runtime.
2. Run `npm run smoke -- https://taxwise-freelance.vercel.app`; expect the sample receipt scan
   and all subsequent steps to pass. Also check invoice PDF download as described in the runbook.
3. If scanning fails, filter function runtime logs for `"event":"receipt_ocr_error"`.
   Each single-line JSON record includes `source` (`recognize` or `worker`), `name`, `message`,
   `code`, and `stack`. String-only worker errors have null code/stack. Missing-file/module paths
   should now identify the failing dependency; no image, recognized text, or request context is logged.
4. Confirm the pg `sslmode=require` ambiguity warning is absent while database health stays OK.

Remaining: hosted verification under Vercel's Linux/Node 22 function environment, deliberately
left to the orchestrator per the no-deploy instruction. No other open questions.
