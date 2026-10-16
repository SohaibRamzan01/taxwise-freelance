# TaxWise Freelance — Agent Instructions

This repo is built by **Codex** (implementer) under the direction of **Claude** (orchestrator).
Codex reads this file automatically on every run.

## Workflow
- Each task arrives as a brief in `orchestration/tasks/NNN-<slug>.md`. Do exactly that task; don't expand scope.
- When finished, write a short report to `orchestration/reports/NNN-<slug>.md` with:
  - what was built / changed (files list)
  - commands run to verify (build, tests, lint) and their results
  - anything left undone, assumptions made, or open questions
- Do not commit — the orchestrator reviews and commits.

## Standards
- Keep code simple, typed where the stack allows, and consistent with existing patterns.
- Add or update tests for any logic you write (especially tax calculations).
- Never hard-code secrets; use `.env` (gitignored) and keep `.env.example` updated.
- Run the project's build and tests before reporting done; report failures honestly.

## Project context
See `orchestration/PROJECT.md` for the product spec, stack, and architecture decisions.
