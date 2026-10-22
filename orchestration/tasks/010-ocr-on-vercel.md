# Task 010 — Make receipt OCR work on Vercel production

The app is deployed at https://taxwise-freelance.vercel.app (Vercel Hobby, Node serverless, Neon Postgres).
`npm run smoke -- https://taxwise-freelance.vercel.app` passes every step **except**
`POST /api/receipts/scan` → **422 OCR_FAILED** ("Unable to read this receipt"). The same scan passes locally
(`next start`) and in CI. On Vercel the request fails in ~0.4 s, i.e. before recognition could run — most likely
`createWorker` cannot start (worker script / tesseract.js-core WASM / traineddata path not found in the traced
serverless bundle, worker_threads resolution from an external package, or a read-only filesystem write).
`src/lib/receipts/ocr.ts` swallows the underlying error, so Vercel's runtime logs show nothing useful.

Read `orchestration/PROJECT.md`, `src/lib/receipts/ocr.ts`, `next.config.ts`, `scripts/verify-server-bundle.mjs`,
`docs/week-11-deployment.md`.

1. **Diagnostics:** in `recognizeReceipt`, before mapping to OCR_FAILED, `console.error` a single structured line
   with the error name/message/code and stack (no image bytes, no user data). Do the same for tesseract.js worker
   `errorHandler` events. Keep the user-facing message unchanged.
2. **Make the Vercel bundle self-sufficient** — investigate and fix the likely causes rather than guessing one:
   - Pass explicit `corePath` (tesseract.js-core directory/wasm for Node) as well as `workerPath` and `langPath`,
     all resolved to files that `outputFileTracingIncludes` actually ships for the `/api/receipts/scan` route (check
     the route key/glob matches the real route path; Next 16 keys are route paths like `/api/receipts/scan`).
   - Make sure nothing writes outside `/tmp` (tesseract cache, langPath download) — `cacheMethod: "none"` is set;
     confirm no `gzip`/download attempt for traineddata (use the bundled `eng.traineddata`, `gzip: false` if needed).
   - Simulate the serverless layout locally: after `npm run build:local`, run the scan using only the files listed in
     `.next/server/app/api/receipts/scan/route.js.nft.json` (e.g. copy them into a temp dir with the `.next` output,
     or extend `scripts/verify-server-bundle.mjs` to assert every path tesseract will open at runtime is traced —
     worker script entry and its requires, core JS + `.wasm`, traineddata). Fix any gaps.
   - If tesseract.js's Node worker cannot run reliably in a Vercel function, fall back to running recognition in the
     same thread (e.g. tesseract.js `createWorker` alternative or `tesseract.js-core` direct API) — choose the
     simplest robust option and explain why in the report.
3. **Postgres SSL warning (minor):** Vercel logs show the `pg-connection-string` warning that `sslmode=require` is
   treated as `verify-full`. In `src/lib/db.ts` keep TLS verification on but silence the ambiguity (e.g. normalise
   `sslmode=require` to `sslmode=verify-full` in the connection string passed to the adapter). Unit-test the helper.
4. Keep lint, typecheck, `npm test`, `build:local`, `verify:bundle` passing; run `npm run smoke` against a local
   `next start` (local DB is `localhost:5434/taxwise`, already in `.env`). Do NOT deploy. Report to
   `orchestration/reports/010-ocr-on-vercel.md`: root-cause hypothesis and evidence, what changed, how the orchestrator
   should verify on Vercel (which log line to look for).
