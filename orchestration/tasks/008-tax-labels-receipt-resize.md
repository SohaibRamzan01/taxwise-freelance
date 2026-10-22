# Task 008 — Clear tax figures on the dashboard + shrink receipt photos before upload

Read `orchestration/PROJECT.md` and the existing code. Keep existing patterns. Small, focused task.

1. **Confusing tax numbers.** With the reset demo data, the dashboard shows "Estimated tax balance $7,807.84" and,
   in the Tax deadlines card, "Total remaining for the year $4,150.00". To a user these contradict each other.
   Work out exactly what each figure is (likely: projected annual liability − payments, vs. the required payment
   target remaining, which uses the lower safe-harbour target when enabled). Then make the UI self-explanatory on
   the dashboard **and** the tax estimator: consistent names across both pages (e.g. "Projected tax still owed for
   2026" vs "Minimum to pay by deadlines to avoid penalties (safe harbour)"), a one-line hint under each figure
   explaining it, and show which method is active (regular vs safe harbour). Do not change the calculation unless
   you find a real bug (if so, fix it with a test and explain in the report). Keep wording simple.
2. **Receipt photos larger than Vercel's 4.5 MB request limit.** In the receipt scanner, before upload, downscale
   images client-side (canvas / `createImageBitmap`) to max 2000 px on the long edge and re-encode as JPEG
   (quality ~0.85) when the file is > 1.5 MB or larger than 2000 px, respecting EXIF orientation. Keep the
   server-side limits and magic-byte checks unchanged. Show the user a friendly message if the image is still too
   large. Put the size/dimension decision logic in a pure, unit-tested helper. Update `docs/week-11-deployment.md`
   to reflect that photos from phones work on Vercel.
3. Keep lint, typecheck, test, build:local passing; run `npm run smoke -- http://localhost:<port>` against
   `next start`. Report to `orchestration/reports/008-tax-labels-receipt-resize.md`.
