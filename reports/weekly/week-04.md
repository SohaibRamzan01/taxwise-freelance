---
title: Week 4 Progress Report — Database Modeling & UI Wireframes
milestone: Database Modeling & UI Wireframes
slug: Database-API-Wireframes
date: 10 November 2026 (period: 4–10 Nov 2026)
---

# 1. Week 4 objectives

| Required deliverable | Status |
| --- | --- |
| Database ERD with indexing definitions | Completed — ERD plus explicit index table (Appendix A, section 1) |
| Complete REST API endpoint contracts | Completed — 47 endpoints with request/response schemas and error codes (Appendix A, section 3) |
| UI wireframes for 4–6 primary screens | Completed — 6 annotated wireframes (Appendix A, section 4) |

# 2. Database design

- **Entities:** User, Session, UserSettings, Client, Invoice, InvoiceItem, Expense, Income, EstimatedPayment, AuditLog.
- **Money** is stored as integer cents to avoid floating-point rounding errors.
- **Tenant isolation** is enforced in the database itself: composite foreign keys `(id, userId)` prevent cross-tenant references.
- **Invoice numbers** are unique per user (`INV-0001`, `INV-0002`, …).
- **Indexes** exist only where a query needs them — for example `(userId, date)` on expenses and income for date-range lists, `(userId, status, dueDate)` on invoices for outstanding/overdue views, and `UNIQUE(email)` on users for login.

# 3. API design

| Area | Examples |
| --- | --- |
| Authentication & settings | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/settings` |
| Expenses | List with search/filter/sort/pagination, CRUD, AI category suggestion, batch delete/re-categorise, CSV import/export |
| Income & clients | CRUD with filters |
| Invoices | CRUD, status transitions, mark paid (creates linked income), printable view |
| Tax | `GET /api/tax/estimate?year=`, estimated payments CRUD, `GET /api/dashboard` |
| Administration | Users list, activate/deactivate, change role, analytics, audit log |
| Health | `GET /api/health` (app + database status) |

All errors share one JSON shape: `{ "error": { "code", "message", "details?" } }`.

# 4. Wireframes

| # | Screen | Use cases |
| --- | --- | --- |
| 1 | Login / Signup | UC-01 |
| 2 | Dashboard | UC-09 |
| 3 | Expenses list | UC-02, UC-09 |
| 4 | Invoice editor | UC-04, UC-05, UC-06 |
| 5 | Tax estimator | UC-07, UC-08 |
| 6 | Admin portal | UC-10 |

# 5. Challenges and how they were handled

| Challenge | Resolution |
| --- | --- |
| A stored OVERDUE status could drift out of date | OVERDUE is derived from SENT status + due date when read |
| Duplicate income if "mark paid" is retried | Unique link between an invoice and its income row, written in one transaction |

# 6. Plan for Week 5

- Initialise the repository, directory scaffolding and branch protection.
- Verify the database connection and run the first migration.
- Implement secure multi-tenant authentication: signup, login, bcrypt hashing, JWT session cookies.

<div class="appendix"></div>

# Appendix A — Database, API contracts and wireframes

<!-- include: docs/week-04-database-api-wireframes.md -->
