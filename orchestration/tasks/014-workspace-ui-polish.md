# Task 014 — Workspace UI polish (Operate mode)

Read `PRODUCT.md` first. Surfaces: the signed-in workspace (`src/app/(workspace)/**`,
`src/components/app-shell.tsx`, `src/components/domain/*.tsx`, `src/app/globals.css`) and the auth
pages (`src/components/auth-page.tsx`). Mode is Operate: precision and restraint, scanability first.
Keep the existing navy/yellow token system, fonts, light/dark themes, every route, API call, handler,
accessible label, `data-testid`, and test expectation. This is refinement, not a redesign.

Issues found in review (fix these):
1. **Eyebrow labels** — every page header repeats an uppercase kicker ("YOUR BUSINESS, IN FOCUS") above
   the H1, and auth pages have similar kickers ("INDEPENDENT, TOGETHER.", "YOUR BUSINESS STARTS WITH
   YOU"). Remove all eyebrow/kicker labels above headings (the sidebar nav group label may stay).
   Keep the subtitle line under each H1.
2. **KPI row (dashboard + tax estimator)** — four identical boxed cards. Replace with one ledger strip:
   a single surface split by 1px rules into cells (label, figure, helper text), equal height, with the
   most important figure ("Estimated tax still owed" on dashboard, "Payment target still due" on the
   estimator) emphasised by the yellow highlighter treatment behind the figure. Figures use tabular
   numerals. On ≤ 640px it becomes a 2-column grid, on ≤ 400px one column. Figures count up once on
   first render (≈700 ms, ease-out), but render the final value immediately under reduced motion and
   on the server (no hydration mismatch: start from the final value in SSR markup, animate only after
   mount).
3. **Deductions by category donut** — 17 thin slices are unreadable. Replace with a ranked horizontal
   bar list: categories sorted by amount desc, each row = colour swatch + name + bar (width relative to
   the largest) + amount in mono; show the top 6 and a "Show all N categories" disclosure for the rest.
   Keep the category colours from `src/lib/category-colors.ts` and the existing accessible data
   disclosure. Recharts no longer needed for this chart (keep it for income vs expenses).
4. **Expense amounts in red** — every amount in the expenses table is red, which reads as an error.
   Use the normal ink colour for amounts; keep red only for genuine negatives/overdue states.
5. **Income vs expenses chart** — give bars rounded tops (radius 4), a softer grid (dashed, `--rule`),
   tooltip styled with surface tokens, and highlight the current month's label.
6. **Interaction polish** — table rows get a subtle hover background (`--sunk`) and visible
   focus-within; buttons get a 120 ms press state (scale .98) and consistent hover; sidebar active item
   keeps the yellow pill but add a smooth transition; page content fades/slides in 8px once on route
   change (200 ms, `cubic-bezier(.23,1,.32,1)`), disabled under reduced motion.
7. **Empty / loading states** — check each list page (expenses, income, invoices, clients, estimated
   payments, reports) has a friendly empty state with a primary action; add any that are missing,
   using a small lucide icon, one sentence, and the page's create button.
8. **Browser surfaces** — themed `::selection`, scrollbar (thin, `--rule-2` thumb) in both themes,
   `accent-color` for checkboxes/radios, date inputs with `color-scheme` matching the theme so the
   calendar icon is visible in dark mode.
9. **Auth pages** — keep layout; remove kickers; make the left navy panel more alive with a quiet
   static composition of 3 small CSS receipt slips with category chips (decorative, `aria-hidden`).

Bans: eyebrow labels, gradient text, glass decoration, thick coloured `border-left` accents, hard
offset shadows, emoji icons, new dependencies.

Acceptance: all workspace pages render in light and dark at 390px and 1440px with no horizontal page
scroll; contrast ≥ 4.5:1; existing tests pass (update test expectations only where a removed eyebrow
or the replaced donut is asserted, and say so in the report); lint + typecheck clean.

Working rules: Only edit files inside this project. Do not run any commands; only edit files. Do not ask
questions. Do not touch `src/lib/api.ts`, `src/lib/api.test.ts`, the tax engine, API routes, Prisma, or
the landing page files from task 013 (`src/app/page.tsx`, `src/components/landing/*`) — but you may
add workspace CSS to `globals.css` without altering the landing rules. Write
`orchestration/reports/014-workspace-ui-polish.md` and list every file you changed.
