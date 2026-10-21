# Task 004 — AI categorisation, batch ops, admin RBAC portal, UX polish (weeks 8–9)

Read `orchestration/PROJECT.md`, `README.md`, and existing code. Build on existing patterns.

1. **Gemini AI categorisation** `src/lib/ai/`: `categorizeExpense({vendor, description, amount})` → category +
   confidence + source ("ai" | "rules"). Calls Gemini REST API (`gemini-2.5-flash`, `GEMINI_API_KEY`) with a strict
   JSON response schema, 5 s timeout, validates output with zod; on missing key / error / timeout / invalid output,
   falls back to a deterministic keyword rules engine (good coverage of common vendors: AWS, Adobe, Zoom, Uber,
   Delta, WeWork, Upwork fees, etc.). Endpoint POST /api/expenses/categorize; "Suggest category" button in the
   expense form and auto-suggest on CSV import. Unit tests for fallback paths (mock fetch).
2. **Batch & data ops**: multi-select on expenses table → bulk delete / bulk re-categorise (single API call,
   tenant-scoped, audited). CSV export of expenses & income (respecting filters); CSV import of expenses with
   preview, validation errors per row, and commit. Global search box (expenses, clients, invoices).
3. **Admin portal** `/admin` (ADMIN role only — enforce on server in every admin route handler, not just middleware):
   overview with telemetry charts (signups per week, active users, invoice volume & value, expenses logged per week),
   users table (search, change role, activate/deactivate; cannot demote/deactivate yourself), audit log viewer with
   filters. APIs under /api/admin/*.
4. **UX polish**: toast notifications for all mutations (success + error), confirm dialogs for destructive actions,
   responsive mobile layout (collapsible sidebar / bottom nav), consistent design system, accessible labels and
   focus states, skeleton loaders, 404 / error pages.
5. Keep lint, typecheck, tests, build:local passing; add tests for new lib code. Report to
   `orchestration/reports/004-ai-admin-polish.md`.
