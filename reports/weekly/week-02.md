---
title: Week 2 Progress Report — Software Requirements Specification
milestone: Software Requirements Specification (SRS)
slug: SRS
date: 27 October 2026 (period: 21–27 Oct 2026)
---

# 1. Week 2 objectives

| Required deliverable | Status |
| --- | --- |
| Formal IEEE 830 SRS document | Completed — introduction, overall description, specific requirements (Appendix A) |
| Formal use-case specifications | Completed — 10 use cases, UC-01 to UC-10 |
| System use-case diagram | Completed — Appendix A, section 5 |
| Quantifiable non-functional requirements (latency, security, uptime) | Completed — NFR-01 to NFR-12, each with a verification method |

# 2. Work completed this week

- Authored the SRS following the IEEE 830 structure: purpose, scope, definitions, product perspective, users, constraints and assumptions, specific requirements.
- Defined **13 functional requirements (FR-01 – FR-13)** covering authentication, expenses, income, the tax estimator, invoicing, estimated payments, dashboard, settings, search/filter/batch, AI categorisation, admin portal, CSV import/export and health monitoring.
- Wrote a precise **tax calculation contract** for the 2026 US federal rules: standard deduction, brackets per filing status, self-employment tax (92.35% base, 12.4% Social Security up to $184,500, 2.9% Medicare, 0.9% additional Medicare), half-SE deduction, simplified 20% QBI, and the 100%/110% safe-harbour rule.
- Specified **10 formal use cases** (actor, preconditions, main flow, alternate flows, postconditions) and drew the system use-case diagram.
- Specified **12 measurable non-functional requirements**.

# 3. Headline non-functional requirements

| ID | Area | Target |
| --- | --- | --- |
| NFR-01 | Latency | Warm authenticated API p95 < 300 ms (1,000 requests, 10 concurrent users, 10,000 expenses per tenant) |
| NFR-02 | Uptime | ≥ 99.5% per month, measured by 1-minute synthetic health checks |
| NFR-03 | Authentication security | bcrypt cost 12; HS256 JWT, 7-day expiry, httpOnly + Secure + SameSite=Lax cookie |
| NFR-04 | OWASP Top 10 | Access-control, injection, auth, misconfiguration and dependency controls, verified by tests and audit |
| NFR-05 | Abuse protection | 5 login attempts / 15 min per IP+email; 10 signups / hour / IP; same-origin check on mutations |
| NFR-07 | Responsiveness | Layouts work from 320 px to 1440 px wide |
| NFR-08 | Test coverage | ≥ 70% coverage on core domain logic (`src/lib`) |
| NFR-11 | AI resilience | AI suggestion times out at 3 s and falls back to keyword rules; never blocks saving |

# 4. Use cases

| ID | Use case | Primary actor |
| --- | --- | --- |
| UC-01 | Establish an authenticated workspace | Freelancer |
| UC-02 | Record a deductible expense | Freelancer |
| UC-03 | Maintain manual income | Freelancer |
| UC-04 | Manage a client | Freelancer |
| UC-05 | Compose and issue an invoice | Freelancer |
| UC-06 | Record an invoice payment | Freelancer |
| UC-07 | Calculate quarterly estimates | Freelancer |
| UC-08 | Configure tax profile and log payments | Freelancer |
| UC-09 | Inspect dashboard and organise expenses | Freelancer |
| UC-10 | Administer platform access | Administrator |

# 5. Challenges and how they were handled

| Challenge | Resolution |
| --- | --- |
| Tax rules leave rounding and annualisation choices open | Documented explicit choices (integer cents, straight-line annualisation) in the calculation contract |
| Free-tier hosting cannot guarantee an SLA | Uptime NFR is measured and reported honestly instead of claimed |
| Marking an invoice paid twice could double income | Requirement for an idempotent, atomic paid-invoice → income operation (NFR-09) |

# 6. Plan for Week 3

- Draw the 3-tier architecture diagram (client, API server, database).
- Produce DFD Level 0 and Level 1.
- Define system boundaries and justify the cloud infrastructure stack.

<div class="appendix"></div>

# Appendix A — Software Requirements Specification

<!-- include: docs/week-02-srs.md -->
