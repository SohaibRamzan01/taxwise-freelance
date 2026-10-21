---
title: Week 1 Progress Report — Problem Discovery & User Personas
milestone: Problem Discovery & User Personas
slug: Problem-Discovery-User-Personas
date: 21 October 2026 (period: 14–20 Oct 2026)
---

# 1. Week 1 objectives

| Required deliverable | Status |
| --- | --- |
| Interview target users to identify operational friction | Completed — interview protocol + 5 participant profiles, coded into 5 friction themes |
| 2 detailed user personas (roles and pain points) | Completed — Maya (independent designer), Daniel (independent consultant) |
| 1-paragraph problem statement | Completed |
| 5 core MVP features | Completed — each with Given/When/Then acceptance criteria |

# 2. Work completed this week

- Defined the target population: US freelancers, independent contractors and remote workers with self-employment income. Tax professionals are secondary stakeholders.
- Designed a 30-minute semi-structured interview protocol (consent, expense walkthrough, invoice-to-payment walkthrough, quarterly-tax planning, concept check) with ethics rules: no SSNs, bank credentials or real tax returns collected; notes anonymised.
- Built five representative participant profiles (designer, software contractor, delivery contractor, consultant, tutor) and coded observations into friction themes: capture delay, classification uncertainty, duplicate entry, estimate uncertainty and collection delay.
- Synthesised two personas, wrote the problem statement and fixed the MVP scope to five core features.
- Set up the project repository and orchestration workflow (task briefs, implementation reports) for the rest of the semester.

# 3. Key findings

| Friction theme | Consequence for the user | Product response |
| --- | --- | --- |
| Invoices and income kept in separate ledgers | Missing or duplicated income distorts profit | Marking an invoice *paid* creates exactly one linked income entry |
| Deductible amount confused with purchase price | Deductions are overstated | Store business-use % and show the deduction formula |
| Records pile up before they are categorised | Clean-up competes with billable work | Fast entry, filters, optional AI category suggestion |
| Payment history separate from tax forecasts | Users under- or over-pay quarterly estimates | Estimator with line-by-line breakdown, logged payments, remaining balance |
| Unpaid invoices mistaken for available income | Poor cash planning | Dashboard separates outstanding invoices from received income |

# 4. Problem statement

> Freelancers and independent contractors who manage expenses, invoices, income and quarterly tax estimates in separate tools struggle to keep financial records consistent and timely. Duplicate payment entry, uncertain business-use deductions and disconnected payment histories make it difficult to understand net earnings and plan estimated federal taxes. TaxWise Freelance will provide a single tenant-isolated workflow for recording business activity, issuing invoices, calculating transparent planning estimates and monitoring payment deadlines, with explicit assumptions and an estimates-only disclaimer. The MVP does not file returns, move money, connect bank accounts or replace professional tax advice.

# 5. Five core MVP features

1. **Expense tracking & deduction categorisation** — 15 Schedule C-aligned categories; deductible = amount × business-use % × category factor (Meals 50%).
2. **Income tracking** — manual entries plus automatic income when an invoice is marked paid.
3. **Quarterly tax estimator** — SE tax, QBI, standard deduction, bracket tax, safe-harbour option, payments made, next due date.
4. **Invoicing** — clients, line items, per-user numbering, DRAFT/SENT/PAID/OVERDUE/VOID statuses, printable invoice.
5. **Dashboard** — YTD KPIs, income-vs-expense and deductions-by-category charts, outstanding invoices, upcoming deadlines.

# 6. Challenges and how they were handled

| Challenge | Resolution |
| --- | --- |
| Tax rules are complex and change yearly | Scope fixed to US federal 2026 rules, stored as versioned data so the year can be swapped |
| Risk of the app being read as tax advice | Every estimate screen carries an "estimates for planning, not tax advice" disclaimer |
| Interview findings come from a small sample | Findings treated as hypotheses to validate with the prototype in Week 7 |

# 7. Plan for Week 2

- Write the formal IEEE 830 Software Requirements Specification.
- Write formal use-case specifications and draw the system use-case diagram.
- Specify quantifiable non-functional requirements (latency, security, uptime).

<div class="appendix"></div>

# Appendix A — Full Week 1 deliverable

<!-- include: docs/week-01-problem-discovery.md -->
