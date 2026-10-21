---
title: Week 4 Report — Database Modeling & UI Wireframes
milestone: Database Modeling & UI Wireframes
slug: Database-API-Wireframes
period: 4 – 10 November 2026
date: 11 November 2026
---

# 1. Summary

This week I designed the **database**, the **API** that the app's screens use to talk to the server, and **wireframes** (simple sketches) of the main screens.

<div class="glance">
<div><b>9</b><span>database tables</span></div>
<div><b>30+</b><span>REST API endpoints</span></div>
<div><b>6</b><span>screen wireframes</span></div>
</div>

| Task from the plan | Status |
| --- | --- |
| Database ERD with index definitions | Done — Figure 1 and section 3 |
| Complete REST API endpoint contracts | Done — section 4 |
| UI wireframes for 4–6 main screens | Done — 6 screens, section 5 |

# 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
  USER ||--o{ CLIENT : has
  USER ||--o{ INVOICE : creates
  USER ||--o{ EXPENSE : records
  USER ||--o{ INCOME : earns
  USER ||--o{ ESTIMATED_PAYMENT : pays
  USER ||--o{ AUDIT_LOG : "is logged in"
  CLIENT ||--o{ INVOICE : receives
  INVOICE ||--|{ INVOICE_ITEM : contains
  INVOICE ||--o| INCOME : "creates when paid"
  EXPENSE ||--o| RECEIPT : "has photo"
  USER {
    string id PK
    string email UK
    string passwordHash
    enum role "USER or ADMIN"
    enum filingStatus
    int priorYearTaxCents
    string businessName
  }
  CLIENT {
    string id PK
    string userId FK
    string name
    string email
  }
  INVOICE {
    string id PK
    string userId FK
    string clientId FK
    string number "INV-0001"
    enum status
    date dueDate
    int totalCents
  }
  INVOICE_ITEM {
    string id PK
    string invoiceId FK
    string description
    decimal quantity
    int unitPriceCents
  }
  EXPENSE {
    string id PK
    string userId FK
    date date
    string vendor
    int amountCents
    enum category
    int businessUsePercent
  }
  RECEIPT {
    string id PK
    string expenseId FK
    bytes image
    text ocrText
  }
  INCOME {
    string id PK
    string userId FK
    string invoiceId FK "optional"
    date date
    int amountCents
  }
  ESTIMATED_PAYMENT {
    string id PK
    string userId FK
    int taxYear
    int quarter
    int amountCents
  }
  AUDIT_LOG {
    string id PK
    string userId FK
    string action
    datetime createdAt
  }
```
<div class="caption">Figure 1 — Entity-Relationship Diagram</div>

**Simple rules in the design:**

- **Every table has a `userId`.** This keeps each user's data separate (multi-tenant).
- **Money is stored in cents** (whole numbers), e.g. $12.50 is saved as 1250. This avoids rounding errors.
- **Invoice numbers are unique per user** (INV-0001, INV-0002, ...).
- **One paid invoice = one income row.** The database blocks a second one.

# 3. Indexes

An index makes searching a table fast, like the index at the back of a book. I only added indexes for searches the app really does.

| Table | Index | Why it is needed |
| --- | --- | --- |
| User | `email` (unique) | Find a user quickly at login; stop duplicate accounts |
| Expense | `userId, date` | Show a user's expenses for a date range |
| Expense | `userId, category` | Deductions-by-category chart and filters |
| Invoice | `userId, number` (unique) | Unique invoice numbers per user |
| Invoice | `userId, status` | List unpaid / overdue invoices |
| Invoice | `userId, dueDate` | Upcoming due dates on the dashboard |
| Income | `userId, date` | Income totals for the year and per month |
| Income | `invoiceId` (unique) | Makes sure a paid invoice adds income only once |
| EstimatedPayment | `userId, taxYear, quarter` | Payments made in each quarter |
| AuditLog | `userId, createdAt` | Show recent activity in the admin portal |

# 4. REST API endpoints

All endpoints use JSON. Every endpoint except sign-up, login and health needs the user to be logged in. Errors always look the same: `{ "error": { "code", "message" } }`.

| Area | Method & path | What it does |
| --- | --- | --- |
| Auth | `POST /api/auth/signup` | Create an account |
| Auth | `POST /api/auth/login` · `POST /api/auth/logout` | Log in (sets secure cookie) / log out |
| Auth | `GET /api/auth/me` | Who is logged in |
| Settings | `GET` · `PATCH /api/settings` | Tax profile and business details |
| Expenses | `GET` · `POST /api/expenses` | List (search, filter, sort, pages) / add |
| Expenses | `GET` · `PATCH` · `DELETE /api/expenses/:id` | View / edit / delete one expense |
| Receipts | `POST /api/receipts/scan` | Upload a receipt photo; returns vendor, date, total, category |
| Receipts | `GET /api/receipts/:id` | View the saved receipt photo |
| Income | `GET` · `POST /api/income`, `PATCH` · `DELETE /api/income/:id` | Manage income |
| Clients | `GET` · `POST /api/clients`, `PATCH` · `DELETE /api/clients/:id` | Manage clients |
| Invoices | `GET` · `POST /api/invoices`, `GET` · `PATCH` · `DELETE /api/invoices/:id` | Manage invoices; change status (e.g. mark paid) |
| Invoices | `GET /api/invoices/:id/pdf` | Download the invoice as PDF |
| Tax | `GET /api/tax/estimate?year=2026` | Full tax estimate with quarterly schedule |
| Tax | `GET` · `POST /api/estimated-payments`, `DELETE /api/estimated-payments/:id` | Log tax payments made |
| Reports | `GET /api/reports/tax-summary?year=2026` | Download the tax-ready summary PDF |
| Dashboard | `GET /api/dashboard` | Totals, chart data, unpaid invoices, deadlines |
| Admin | `GET /api/admin/users`, `PATCH /api/admin/users/:id` | List users, change role, activate/deactivate |
| Admin | `GET /api/admin/stats` · `GET /api/admin/audit-log` | Platform charts and activity log |
| Health | `GET /api/health` | Is the app and database working? |

**Example — scan a receipt**

Request: `POST /api/receipts/scan` with the photo as form data.
Response: `{ "vendor": "Dell", "date": "2026-10-03", "totalCents": 89900, "suggestion": { "category": "COMPUTER_HARDWARE", "confidence": 0.9 } }`

# 5. Wireframes

<div class="cards">
<div class="wf">
<div class="bar">1 · Login / Sign up</div>
<div class="row"><div class="box">Logo + "Track deductions, send invoices, plan quarterly tax"</div></div>
<div class="row"><div class="box">Email</div></div>
<div class="row"><div class="box">Password</div></div>
<div class="row"><span class="btn">Log in</span>&nbsp; Don't have an account? <u>Sign up</u></div>
</div>
<div class="wf">
<div class="bar">2 · Dashboard</div>
<div class="row"><div class="box">Income YTD</div><div class="box">Expenses</div><div class="box">Deductions</div><div class="box">Tax owed</div></div>
<div class="row"><div class="box" style="min-height:16mm">Chart: income vs expenses by month</div><div class="box">Chart: deductions by category</div></div>
<div class="row"><div class="box">Unpaid invoices</div><div class="box">Next tax due: 15 Jan 2027</div></div>
</div>
<div class="wf">
<div class="bar">3 · Expenses + Scan receipt</div>
<div class="row"><span class="btn">Scan receipt</span>&nbsp;<span class="btn">+ Add expense</span>&nbsp; Search · Category ▾ · Date ▾</div>
<div class="row"><div class="box">Table: date · vendor · category · amount · business % · deductible · receipt</div></div>
<div class="row"><div class="box">Scan dialog: photo preview → vendor / date / total filled in → category "Hardware (auto)" → <b>Save</b></div></div>
</div>
<div class="wf">
<div class="bar">4 · Invoice editor</div>
<div class="row"><div class="box">Client ▾</div><div class="box">Issue date</div><div class="box">Due date</div></div>
<div class="row"><div class="box">Line items: description · qty · price · amount &nbsp;[+ add line]</div></div>
<div class="row"><div class="box">Subtotal · discount · tax · <b>Total</b></div></div>
<div class="row"><span class="btn">Save draft</span>&nbsp;<span class="btn">Mark sent</span>&nbsp;<span class="btn">Mark paid</span>&nbsp;<span class="btn">Download PDF</span></div>
</div>
<div class="wf">
<div class="bar">5 · Tax estimator</div>
<div class="row"><div class="box">Year ▾ · Filing status ▾ · Safe harbour ☐</div></div>
<div class="row"><div class="box">Breakdown: profit → SE tax → deductions → taxable income → income tax → total</div></div>
<div class="row"><div class="box">Q1 · Q2 · Q3 · Q4 — due date · amount · paid · remaining</div></div>
<div class="row"><span class="btn">Record payment</span>&nbsp; "Estimates for planning, not tax advice"</div>
</div>
<div class="wf">
<div class="bar">6 · Reports / Admin portal</div>
<div class="row"><div class="box">Reports: Year ▾ Quarter ▾ → key totals → <b>Download tax summary PDF</b> · CSV</div></div>
<div class="row"><div class="box">Admin: charts (sign-ups, invoices, expenses per week)</div></div>
<div class="row"><div class="box">Admin: users table — role ▾ · active ☑ · audit log</div></div>
</div>
</div>

# 6. Challenges and solutions

| Challenge | Solution |
| --- | --- |
| Where to store receipt photos for free | Save them inside PostgreSQL (as bytes) — no paid file storage needed |
| "Overdue" could become out of date if saved | Work it out from the due date each time an invoice is read |
| Keeping screens simple on phones | Each wireframe has a single-column mobile layout; tables become cards |

# 7. Plan for next week (Week 5)

- Set up the Git repository with branch protection and the project folders.
- Connect to the PostgreSQL database and run the first migration.
- Build secure sign-up and login (bcrypt password hashing, JWT session cookie).
