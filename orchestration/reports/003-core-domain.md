# Task 003 — Core domain and vertical slice

Implemented the requested tax engine, authenticated domain services/API, and functional workspace UI. No Prisma schema changes or migrations were needed. No commit created.

## Files built / changed

- `src/lib/tax/{types.ts,categories.ts,engine.ts,index.ts,rules/2026.ts,engine.test.ts}`: pure versioned 2026 US rules; exact integer arithmetic and cent rounding; expense deductions, SE/Medicare, progressive brackets, QBI, annualisation, and quarterly/safe-harbour breakdowns.
- `src/lib/domain/{validation.ts,invoices.ts,service.ts,routes.ts,summary.ts}` and `{validation,service,summary}.test.ts`: strict Zod inputs; tenant-scoped CRUD/list queries; account-serialized transactions with conflict retries; invoice totals, sequence allocation, status/overdue handling and linked-income synchronization; transactional delete audits; dashboard/tax aggregation and safe profile projections.
- `src/lib/{money.ts,errors.ts,api.ts}`: shared money parsing/display and framework-free API error class, preserving the existing error envelope.
- `src/app/api/{expenses,income,clients,invoices,estimated-payments}/route.ts` and corresponding `[id]/route.ts`: collection/item CRUD. Added `api/dashboard/route.ts`, `api/tax/estimate/route.ts`, and `api/settings/route.ts`.
- Workspace `dashboard`, `expenses`, `income`, `clients`, `invoices`, `tax-estimator`, and `settings` pages; new `estimated-payments/page.tsx`, `invoices/[id]/print/page.tsx`, `loading.tsx`, and `error.tsx`.
- `src/components/domain/{common,records,invoice-editor,dashboard,tax-estimator,settings,print-button}.tsx`, `src/components/app-shell.tsx`, and `src/app/globals.css`: responsive tables/forms/dialogs, invoice editor/print CSS, Recharts dashboard, calculation/bracket tables, payment recording, loading/empty/error feedback and tax disclaimer.
- `src/middleware.ts` and `src/middleware.test.ts`: protect the estimated-payment workspace route.
- `package.json` / `package-lock.json`: Recharts dependency. `README.md` / `.env.example`: API/model documentation and optional local smoke origin.
- `scripts/smoke-domain.mjs`: reproducible local HTTP/DB verification with disposable accounts and fixture cleanup.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 9 files, 98 tests |
| `npm run test:coverage` | PASS — src/lib: 99.43% lines, 98.75% statements, 95.98% branches, 99.02% functions; exceeds all 70% thresholds |
| `npm run build:local` | PASS — optimized production build and route generation |
| `npx prisma migrate deploy` with local port-5433 DATABASE_URL | PASS — existing migration current; none pending |
| `npm run db:seed` with local DATABASE_URL and transient random seed password | PASS — demo account already exists, so seed safely skipped |
| `node scripts/smoke-domain.mjs` against the local development server and port-5433 DB | PASS |
| `npm audit --json` | Reports 5 high findings in the existing ESLint → fast-glob → micromatch → braces development dependency chain; left for the security task |

Smoke coverage: two signups; clients; INV-0001/INV-0002 numbering; server-computed $257.40 invoice; derived overdue filtering; paid/repeated-paid/un-paid/re-paid synchronization; linked-income edit/delete protection; expense PATCH retaining 80% business use; manual income; actual-YTD estimate (income 30,740 cents, deductions 4,000 cents, tax 3,778 cents); estimated payments; dashboard; settings; print route HTTP 200; malformed input/origin/unauthenticated rejection; cross-tenant GET/PATCH/DELETE and foreign-client invoice rejection; six persisted delete audit entries. All smoke fixtures were removed afterward; the development server was stopped.

Tests include hand-verified $100,000 and $300,000 SE examples, every finite bracket ceiling for all filing statuses, meals/business-use rounding, QBI limits/losses, calendar-day annualisation, safe-harbour AGI boundary, installment remainder/overpayment handling, defaults-free PATCH regression checks, invoice lifecycle/locking, transaction retries, tenant filters, summaries, and authenticated route adapters.

## Assumptions / limitations

- Regular quarterly target is 100% of projected annual liability, divided into four installments; enabling safe harbour selects the lower of that target and 100%/110% of prior-year tax. This follows PROJECT.md without introducing a separate 90% current-year rule.
- Annualisation uses inclusive elapsed UTC calendar days, capped at the full year. Round each monetary calculation line half up to cents; installment remainders go to later quarters. Paid-so-far excludes future-dated payments. Quarterly unpaid amounts are cumulative through that quarter and carry prior-quarter overpayments forward.
- Engine accepts alternate year/jurisdiction rule objects; API/UI currently support 2026 US federal and USD. QBI is the specified simplified below-threshold model. W-2 wages, withholding, credits, capital gains and state/local taxes are excluded and disclosed in the UI. Sending an invoice records its status; it does not email it.
- Browser approval gate denied localhost access, so rendered visual/mobile/print-layout inspection and browser interaction checks could not be completed. HTTP print verification, compilation and automated logic/API checks passed; browser QA remains for review.
- Build retains the scaffold's pre-existing `middleware` → `proxy` deprecation warning. Unrelated concurrent orchestration/weekly-report edits were preserved.
