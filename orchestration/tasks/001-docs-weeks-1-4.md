# Task 001 — Engineering documentation for weeks 1–4

Write academic-quality Markdown docs under `docs/` (only touch `docs/`; another agent is building the app in
parallel). Base everything on `orchestration/PROJECT.md`. Use Mermaid for every diagram (fenced ```mermaid blocks)
so they render on GitHub. Be specific to TaxWise Freelance — no generic filler.

Files:
1. `docs/week-01-problem-discovery.md` — interview plan + summary of 5 representative (clearly labelled
   illustrative) user interviews, operational friction findings, 2 detailed User Personas (role, goals, pain points,
   tools today, quote, scenario), 1-paragraph Problem Statement, the 5 core MVP features with acceptance criteria.
2. `docs/week-02-srs.md` — IEEE 830 structured SRS (Introduction/purpose/scope/definitions, Overall description,
   Specific requirements: functional FR-xx, external interfaces, quantifiable NFRs: p95 API latency < 300 ms,
   99.5% uptime, bcrypt cost 12, JWT expiry, OWASP Top 10, WCAG 2.1 AA, etc.), formal Use Case specifications
   (UC-01..UC-10 with actors, preconditions, main/alternate flows, postconditions), Mermaid use case diagram.
3. `docs/week-03-architecture.md` — 3-tier architecture diagram, cloud topology (Vercel edge/serverless + Neon
   Postgres + Gemini API + GitHub Actions), DFD Level 0 (context) and Level 1, system boundaries, justified cloud
   stack choice with comparison table vs alternatives (Render, Supabase, Railway, Firebase), cost = $0 tier.
4. `docs/week-04-database-api-wireframes.md` — ERD (Mermaid erDiagram) for: User, Session/AuditLog, Client,
   Invoice, InvoiceItem, Expense, Income, EstimatedPayment, TaxProfile/Settings — with PKs, FKs, and an explicit
   index definitions table with justification; complete REST API contracts (method, path, auth, request schema,
   response schema, error codes) for auth, expenses, income, clients, invoices, tax estimate, payments, dashboard,
   admin, health; wireframes for 6 screens (Login/Signup, Dashboard, Expenses list, Invoice editor, Tax estimator,
   Admin portal) as ASCII/box-drawing layouts in code blocks with annotations.
5. `docs/README.md` — index linking all docs and mapping each week's deliverables to files.

Note: the app's final schema may differ slightly; keep docs consistent with PROJECT.md. Report to
`orchestration/reports/001-docs-weeks-1-4.md`.
