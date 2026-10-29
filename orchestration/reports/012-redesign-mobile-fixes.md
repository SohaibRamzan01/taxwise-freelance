# Task 012 — Mobile tables and visual fixes

## Changes

- `src/app/globals.css`: shared record cards at screen widths ≤640px, visually hidden semantic column headers, visible expense select-all control, label/value rows, right-aligned monospace amounts, prominent invoice totals, category/status chips and wrapping action buttons. Desktop table styles remain intact. Added theme-aware logo tile tokens, put the sample caption after the receipt's natural height, and tightened mobile header spacing with 40px controls and 16px search input text.
- `src/components/domain/records.tsx`: applied the shared cards to Expenses, Invoices, Clients, Income and Estimated payments; added cell labels, identity headings and column scopes. Existing action handlers, accessible control labels and links are preserved.
- `src/components/domain/admin.tsx`: labelled Users and Audit log cards; role/status chips appear only on mobile.
- `src/components/domain/reports.tsx`: labelled category-summary cards with the existing category palette, preserving desktop appearance.
- `src/components/global-search.tsx`: mobile search-submit icon with the existing Search accessible name; desktop retains its text button.
- `src/components/domain/records.test.ts`: 11 rendering regression tests covering semantic labels, selection controls, all invoice lifecycle actions, PDF/print links, linked-income protections and report category amounts.
- This report.

Preserved the pre-existing task 011 changes and other working-tree edits. No commits made.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test` | PASS: 337 passed, 1 skipped; 34 test files passed, 1 skipped |
| `npm.cmd run build:local` | PASS: all 43 static pages generated |
| `npm.cmd run verify:bundle` | PASS: all three asset traces and isolated OCR with network/host writes disabled |
| `npm.cmd run start -- --port 3000`, then `npm.cmd run smoke -- http://localhost:3000` | PASS: health, signup, client/invoice creation, paid-invoice income, real OCR, private receipt, tax estimate, tax PDF, notifications/admin denial, fixture cleanup and logout |
| `git -c core.safecrlf=false diff --check` | PASS |

The first new rendering-test run failed because its fixture used lowercase `single` instead of the domain's `SINGLE` filing status; TypeScript also caught overly narrow fixture inference. Both test issues were corrected before the passing final lint/typecheck/test runs.

The smoke script cleaned its domain fixtures. Its disposable user (`smoke-e3c25526e24a8d357deb@example.test`) and audit records remain, as documented by the script, because there is no account-delete API.

## Remaining / uncertainties

- Browser visual QA was blocked: the browser approval gate rejected navigation to `http://localhost:3000`, stating that permission was declined. No alternate browser path was attempted. The 390px/1366px rendered layout, light/dark appearance and real screen-reader behavior still need orchestrator review; rendering tests verify markup and control preservation, not pixel layout.
- Only the tables named in the brief receive the shared mobile-card treatment; chart-data disclosures, quarterly plan tables and printable invoice line items retain their existing layouts.
