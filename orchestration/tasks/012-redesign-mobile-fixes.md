# Task 012 — Follow-up to 011: mobile tables + small visual fixes

The orchestrator reviewed task 011 in a real browser (light + dark, 1366 px and 390 px). Desktop is excellent — keep
it exactly as is. Fix only the items below; reuse the 011 tokens/classes.

1. **Mobile card layout for every records table.** At ≤ 640 px only Expenses turns rows into cards; these still render
   squeezed tables where columns wrap word-by-word and the Actions column is clipped (horizontal scroll inside the
   panel): **Invoices** (actions PDF / Send / Mark paid / Un-pay / Void / Reopen cut off), **Clients** (Actions cut
   off), **Income**, **Estimated payments**, the **Reports** category table, and the **Admin** users and audit-log
   tables. Give them the same card treatment as Expenses (label/value rows, mono amounts right-aligned, status/category
   chips, actions as a row of buttons that can wrap, selection checkbox where present). Invoice number + client on top,
   total prominent. Keep semantic tables for desktop/screen readers (or equivalent accessible markup) and keep all
   existing labels/test ids.
2. **Landing hero "Sample data" label** is hidden behind the receipt paper stack (only "Sa…" visible) on desktop and
   mobile. Place it clearly below/beside the stack, never overlapped.
3. **Brand mark in dark mode** shows the yellow chart glyph with no tile, while light mode has a navy tile. Give the dark
   mode mark a tile too (e.g. yellow tile with navy glyph or sunk tile) so it reads as a logo in both themes (sidebar,
   auth page, landing nav, footer).
4. **Mobile top bar:** the search input text/placeholder is larger than the rest of the bar and crowds the bell and theme
   toggle at 390 px. Tidy it (keep ≥ 16 px font to avoid iOS zoom but tighten padding/width, or collapse search to an
   icon that expands) — no overlap, all controls ≥ 40 px touch targets.

Keep lint, typecheck, test, build:local, verify:bundle passing; run smoke against `next start`. Report to
`orchestration/reports/012-redesign-mobile-fixes.md` with the files changed and anything uncertain.
