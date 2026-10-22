# Task 009 — Finish task 008 (verification + report only)

Task 008 (`orchestration/tasks/008-tax-labels-receipt-resize.md`) was implemented in the working tree but the run was
interrupted during final verification, so no report was written. The orchestrator already confirmed lint, typecheck
and `npm test` (289 passed, 1 skipped) pass on the current tree.

Do NOT re-implement. Review the uncommitted 008 changes (`git status`, `git diff`) against the 008 brief; fix only
genuine gaps or bugs you find. Then:

1. `npm run build:local` must pass.
2. Start `next start` on a free port and run `npm run smoke -- http://localhost:<port>`; stop the server afterwards.
3. Confirm the dashboard and tax estimator use the same, simple labels for the two tax figures, and that the
   receipt-resize helper is used by the scanner before upload.
4. Write `orchestration/reports/008-tax-labels-receipt-resize.md` describing what 008 changed (files, what each tax
   figure means and the new labels, resize behaviour), commands run and results, and any open items.
