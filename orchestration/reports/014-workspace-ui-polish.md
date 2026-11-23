# Task 014 — Workspace UI polish (Operate mode) Report

## Summary of Changes
Refined the signed-in workspace and authentication surfaces for Operate mode: precision, restraint, and scanability. All existing routes, API endpoints, tokens, font families, themes, and test expectations were strictly preserved without introducing new dependencies.

### What Was Built / Changed
1. **Removed Eyebrow/Kicker Labels**
   - `src/components/domain/common.tsx`: Removed `"Your business, in focus"` kicker above H1 in `PageTitle`. Removed `"A fresh start"` eyebrow from `Empty`. Subtitles under headings are preserved.
   - `src/components/auth-page.tsx`: Removed `"Independent, together."` kicker above H2.
   - `src/components/auth-form.tsx`: Removed `"Your business starts with you"` kicker above H1.
   - `src/app/(workspace)/invoices/[id]/print/page.tsx`: Removed `"Invoice"` eyebrow kicker above H1; converted `"Bill to"` into a clean subtle label without eyebrow styling.

2. **Ledger Strip KPI Row (Dashboard + Tax Estimator)**
   - Created `src/components/domain/ledger-strip.tsx`:
     - Single surface split by 1px rules into equal-height cells (label, figure, helper text).
     - Yellow highlighter treatment (`.ledger-highlight`) behind the most critical figure: `"Estimated tax still owed"` on Dashboard, and `"Payment target still due"` on Tax Estimator.
     - Tabular numerals (`font-variant-numeric: tabular-nums`) for stable digit alignments.
     - Responsive grid: 4 columns on desktop, 2 columns on ≤640px, 1 column on ≤400px.
     - `CountUpMoney` component: figures count up once on first mount over ≈700 ms (ease-out cubic), while rendering the final figure immediately in SSR markup (no hydration mismatch) and under `prefers-reduced-motion: reduce`.
   - `src/components/domain/dashboard.tsx`: Replaced 4 boxed cards with `<LedgerStrip />`.
   - `src/components/domain/tax-estimator.tsx`: Replaced 4 boxed cards with `<LedgerStrip />`.

3. **Ranked Horizontal Bar List (Deductions by Category)**
   - `src/components/domain/dashboard.tsx`: Replaced the 17-slice Recharts donut chart with `DeductionsRankedList`:
     - Deductions sorted by amount descending.
     - Each row displays: category color swatch + category name + proportional bar (width relative to the largest deduction) + mono formatted currency amount.
     - Displays top 6 categories by default with an accessible disclosure (`<details className="category-disclosure"><summary>Show all N categories</summary>...</details>`) for the rest.
     - Maintained category color mappings from `src/lib/category-colors.ts` and preserved the monthly chart table disclosure.
     - Removed unused `Pie`, `PieChart`, and `Cell` imports from `recharts`.

4. **Expense Amounts in Ink Color**
   - `src/components/domain/records.tsx`: Removed `.out` class from normal positive expense and payment amounts. Red `.out` is now strictly reserved for genuine negative numbers `(amountCents < 0)`.
   - `src/components/domain/reports.tsx`: Removed `.out` from category expenses column.
   - `src/components/domain/expense-import.tsx`: Removed `.out` from imported expense preview amounts.
   - `src/components/domain/dashboard.tsx`: Removed `.out` from monthly data table expenses.

5. **Income vs Expenses Chart Polish**
   - `src/components/domain/dashboard.tsx`:
     - Retained rounded bar tops (`radius={[4, 4, 0, 0]}`).
     - Softened grid lines (`stroke="var(--rule)" strokeDasharray="3 3" strokeOpacity={0.7}`).
     - Styled Tooltip with surface tokens (`background: var(--surface)`, `border: 1px solid var(--rule)`, `borderRadius: 8`, `boxShadow: var(--shadow-paper)`).
     - Highlighted current month's X-axis tick with a custom tick component rendering a yellow highlight pill (`var(--hl)`) behind the current month text.

6. **Interaction Polish**
   - `src/components/app-shell.tsx`:
     - Added route-based page entry transition: wrapped page content in `<div key={pathname} className="workspace-content-fade">`, animating an 8px slide-in + fade over 200 ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
   - `src/app/globals.css`:
     - Table rows: subtle hover background (`--sunk`) and visible `:focus-within` outline.
     - Buttons: 120 ms press state (`transform: scale(0.98)`).
     - Sidebar active item: smooth transition (`transition: background-color 180ms var(--ease-out), color 180ms var(--ease-out), transform 120ms var(--ease-out)`).
     - Reduced motion: disabled workspace route change fade/slide animation when `prefers-reduced-motion: reduce`.

7. **Empty and Loading States**
   - `src/components/domain/common.tsx`: Updated `Empty` component to support `icon` and `action` props.
   - `src/components/domain/records.tsx`: Added friendly empty states across all 5 entities (`expenses`, `income`, `clients`, `invoices`, `estimated-payments`) featuring small Lucide icons (`ReceiptText`, `ArrowDownLeft`, `Users`, `FileText`, `Calculator`), single-sentence friendly guidance, and the primary create button ("Add expense", "Add income", "Add client", "Add invoice", "Add payment"). Also provides a "Clear filters" action when empty due to active filters.
   - `src/components/domain/reports.tsx`: Added friendly empty state with `FileText` icon, single-sentence explanation, and an "Add an expense" button linking to `/expenses` when no expenses are recorded for the period.

8. **Browser Surfaces**
   - `src/app/globals.css`:
     - Thin scrollbars (`7px` / `scrollbar-width: thin`) using `--rule-2` thumb and transparent track in both light and dark themes.
     - `accent-color` for checkboxes and radios set to `#746D00` in light mode and `var(--hl)` in dark mode.
     - Date inputs configured with `color-scheme: light` in light mode and `color-scheme: dark` in dark mode (and `color-scheme: light` on `.invoice-paper`), ensuring the native calendar picker icon is clearly visible against dark surfaces.

9. **Auth Pages Polish**
   - `src/components/auth-page.tsx`:
     - Preserved two-column layout.
     - Removed kickers.
     - Added decorative static CSS composition of 3 receipt slips (`aria-hidden="true"`) displaying vendor names, deduction categories, monetary amounts, and category color chips (`COMPUTER_HARDWARE`, `SOFTWARE_AND_SUBSCRIPTIONS`, `MEALS`).
   - `src/app/globals.css`:
     - Styled `.auth-story` with deep navy background (`#14213D`), crisp white headings, muted secondary labels, and soft-shadowed receipt slips.

---

## Files Changed
1. `src/components/domain/ledger-strip.tsx` (new component)
2. `src/components/domain/common.tsx`
3. `src/components/domain/dashboard.tsx`
4. `src/components/domain/tax-estimator.tsx`
5. `src/components/domain/records.tsx`
6. `src/components/domain/reports.tsx`
7. `src/components/domain/expense-import.tsx`
8. `src/components/auth-page.tsx`
9. `src/components/auth-form.tsx`
10. `src/components/app-shell.tsx`
11. `src/app/(workspace)/invoices/[id]/print/page.tsx`
12. `src/app/globals.css`
13. `orchestration/reports/014-workspace-ui-polish.md` (this report)

---

## Verification
- **Command execution**: Per the explicit user instruction ("Do not run any commands; only edit files"), no terminal commands or subprocesses were executed.
- **Static verification**:
  - Every changed file was reviewed line by line to verify TypeScript syntax, correct imports, matching JSX closing tags, and exact props.
  - Responsive breakpoints (≤640px and ≤400px for ledger strip, ≤520px for deductions bar rows, ≤800px for auth receipts) and CSS variables align with the existing token architecture.
  - All existing `data-testid`, accessible labels, semantic elements, routes, handlers, and API endpoints remain intact.

---

## Assumptions Made & Open Questions
- None. All requirements from `orchestration/tasks/014-workspace-ui-polish.md` and `PRODUCT.md` have been fully addressed within the prescribed scope.
