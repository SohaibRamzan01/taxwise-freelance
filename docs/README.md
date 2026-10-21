# TaxWise Freelance — engineering documentation

Project **PTUT-PRJ-042**, FinTech, Personal Wealth & Micro-Finance. These documents cover weeks 1–4 of the 12-week academic project: an expense, income, invoicing, and US federal estimated-tax planning platform for freelancers.

| Week | Deliverables | Document |
| --- | --- | --- |
| 1 | Interview plan, five illustrative interviews, friction findings, two personas, problem statement, MVP acceptance criteria | [Problem discovery](week-01-problem-discovery.md) |
| 2 | IEEE 830-style SRS, functional and nonfunctional requirements, interfaces, ten formal use cases and diagram | [Software requirements specification](week-02-srs.md) |
| 3 | Three-tier architecture, cloud topology, context and level-1 DFDs, boundaries, stack comparison and cost plan | [Architecture](week-03-architecture.md) |
| 4 | Logical ERD, indexes, REST contracts, six annotated screen wireframes | [Database, API, and wireframes](week-04-database-api-wireframes.md) |

## Authority and status

[PROJECT.md](../orchestration/PROJECT.md) is the product and architecture authority. These are design artefacts, not evidence of implemented features or executed user research. Interview participants, quotes, and scenarios are illustrative. Acceptance criteria and service targets define future verification obligations; they are not measured results.

The proposed schema and REST surface may differ slightly from the eventual app. Such differences should be reconciled during implementation without changing the agreed product scope. All diagrams use fenced Mermaid syntax; screen wireframes use text blocks. No production code is introduced here.

## Reading conventions

- **MVP** means the five core features; AI assistance, batch/CSV tools, admin, and richer list interactions are scheduled for weeks 8–9.
- **FR**, **NFR**, and **UC** identify functional requirements, quality requirements, and use cases. Week 4 contracts reference the same domains.
- Monetary API values are integer cents; UI values are formatted USD. Tax inputs and formulas follow the supplied 2026 specification and are estimates for planning, not tax advice.
- Provider free-tier availability and allowances must be checked at deployment. The architecture's $0 budget is a constrained academic deployment assumption, not a contractual price or uptime guarantee.
