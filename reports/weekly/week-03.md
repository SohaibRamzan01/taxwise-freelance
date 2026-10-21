---
title: Week 3 Progress Report — High-Level Architecture & Cloud Topology
milestone: High-Level Architecture & Cloud Topology
slug: Architecture-Cloud-Topology
date: 3 November 2026 (period: 28 Oct – 3 Nov 2026)
---

# 1. Week 3 objectives

| Required deliverable | Status |
| --- | --- |
| 3-tier architecture diagram (client, API server, database) | Completed — Appendix A, section 1 |
| Data Flow Diagram Level 0 (context) | Completed — Appendix A, section 3 |
| Data Flow Diagram Level 1 | Completed — Appendix A, section 4 |
| System boundaries | Completed — boundaries, invariants and a worked transaction example |
| Justified cloud infrastructure stack | Completed — comparison of 5 hosting options and a $0 budget |

# 2. Architecture summary

| Tier | Technology | Responsibility |
| --- | --- | --- |
| Client | Next.js (React) + Tailwind CSS + Recharts | Responsive screens, forms, charts, print-ready invoices |
| API server | Next.js Route Handlers (TypeScript), zod validation, jose JWT | Authentication, tenant-scoped business logic, pure tax engine, AI categorisation with fallback |
| Database | PostgreSQL (Neon in production, local Postgres in development) via Prisma ORM | Users, settings, clients, invoices, expenses, income, estimated payments, audit log |

Key design decisions:

- **Multi-tenancy:** every domain row carries `userId`; every query is scoped by the session user, and composite foreign keys stop one tenant's invoice from referencing another tenant's client.
- **Pure tax engine:** calculation functions have no database, network or clock access, so they are deterministic and unit-testable; tax rules are versioned data per year.
- **Atomic payment recording:** marking an invoice paid and creating its income row happen in one database transaction.
- **External services are optional:** if Gemini AI is unavailable, a deterministic keyword categoriser is used.

# 3. Cloud stack justification

| Component | Choice | Why |
| --- | --- | --- |
| App hosting | Vercel | Native Next.js support, automatic SSL and preview deployments, free hobby tier |
| Database | Neon serverless PostgreSQL | Relational model with transactions; free tier; integrates with Vercel |
| CI | GitHub Actions | Runs lint, typecheck, tests and build on each push |
| AI | Google Gemini (optional) | Free tier for categorisation; the app works without it |

Alternatives evaluated: Render, Supabase, Railway and Firebase. Firebase was rejected because a document store would require redesigning relational constraints and transactions. Planned provider spend is **$0**.

# 4. Challenges and how they were handled

| Challenge | Resolution |
| --- | --- |
| Serverless cold starts and DB connection limits | Neon pooled connection string; latency NFR reports cold starts separately |
| In-memory rate limiting does not share state across instances | Accepted for the academic deployment; documented as a known limitation |
| Free-tier quotas | Small seeded demo dataset, bounded CI runs, quota-failure handling planned for Week 11 |

# 5. Plan for Week 4

- Construct the database ERD with index definitions.
- Specify the complete REST API endpoint contracts.
- Design UI wireframes for 4–6 primary screens.

<div class="appendix"></div>

# Appendix A — Architecture & cloud design document

<!-- include: docs/week-03-architecture.md -->
