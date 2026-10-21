---
title: Week 3 Report — High-Level Architecture & Cloud Topology
milestone: High-Level Architecture & Cloud Topology
slug: Architecture-Cloud-Topology
period: 28 October – 3 November 2026
date: 4 November 2026
---

# 1. Summary

This week I designed **how the system is built**: the three layers of the app, how data moves between them, where the system ends, and which cloud services will run it.

| Task from the plan | Status |
| --- | --- |
| 3-tier architecture diagram (Client, API Server, Database) | Done — Figure 1 |
| Data Flow Diagram Level 0 | Done — Figure 2 |
| Data Flow Diagram Level 1 | Done — Figure 3 |
| Define system boundaries | Done — section 5 |
| Justify the cloud infrastructure stack | Done — section 6 |

# 2. Three-tier architecture

The app has three layers. Each layer only talks to the layer next to it.

```mermaid
flowchart LR
  subgraph T1["Tier 1 — Client (browser)"]
    UI["React pages<br/>Tailwind CSS<br/>Recharts charts"]
  end
  subgraph T2["Tier 2 — API server (Node.js / Next.js)"]
    direction TB
    AUTH["Auth & security<br/>bcrypt · JWT · rate limit"]
    API["REST API<br/>input checks (zod)"]
    LOGIC["Business logic<br/>tax engine · categoriser"]
    OCR["Tesseract OCR<br/>receipt reader"]
    PDF["PDFKit<br/>invoice & report PDFs"]
  end
  subgraph T3["Tier 3 — Database"]
    DB[("PostgreSQL<br/>via Prisma ORM")]
  end
  UI -- "HTTPS + JSON" --> AUTH --> API --> LOGIC
  API --> OCR
  API --> PDF
  LOGIC --> DB
  API --> DB
```
<div class="caption">Figure 1 — 3-tier architecture</div>

| Tier | Technology | Job |
| --- | --- | --- |
| Client | React (Next.js), Tailwind CSS, Recharts | Shows pages, forms and charts in the browser |
| API server | Node.js (Next.js route handlers), TypeScript | Checks who the user is, validates input, runs tax rules, reads receipts (Tesseract OCR), makes PDFs (PDFKit) |
| Database | PostgreSQL with Prisma ORM | Stores users, expenses, receipts, income, clients, invoices and tax payments |

# 3. Data Flow Diagram — Level 0 (context)

Level 0 shows the whole system as **one process** and the outside people and services it exchanges data with.

```mermaid
flowchart LR
  F["Freelancer"]
  A["Admin"]
  G["Gemini AI<br/>(optional)"]
  P(("0<br/>TaxWise Freelance<br/>System"))
  F -- "expenses, receipt photos, invoices, income, tax settings" --> P
  P -- "categories, tax estimates, dashboard, PDF invoices & reports" --> F
  A -- "user management actions" --> P
  P -- "user list, statistics, audit log" --> A
  P -- "expense description" --> G
  G -- "suggested category" --> P
```
<div class="caption">Figure 2 — DFD Level 0 (context diagram)</div>

# 4. Data Flow Diagram — Level 1

Level 1 opens the system and shows its **main processes** and **data stores**.

```mermaid
flowchart TB
  F["Freelancer"]
  P1(("1.0<br/>Manage<br/>account"))
  P2(("2.0<br/>Scan receipt<br/>(OCR)"))
  P3(("3.0<br/>Manage<br/>expenses"))
  P4(("4.0<br/>Manage clients<br/>& invoices"))
  P5(("5.0<br/>Record<br/>income"))
  P6(("6.0<br/>Calculate<br/>tax"))
  P7(("7.0<br/>Create<br/>reports"))
  D1[("D1 Users")]
  D2[("D2 Receipts")]
  D3[("D3 Expenses")]
  D4[("D4 Clients & Invoices")]
  D5[("D5 Income")]
  D6[("D6 Tax payments")]
  F -- "email, password" --> P1 --> D1
  F -- "receipt photo" --> P2 --> D2
  P2 -- "vendor, date, total, category" --> P3
  F -- "expense details" --> P3 --> D3
  F -- "client & invoice details" --> P4 --> D4
  P4 -- "invoice paid" --> P5
  F -- "manual income" --> P5 --> D5
  D3 & D5 & D6 --> P6
  F -- "payments made" --> D6
  P6 -- "tax estimate" --> F
  D3 & D4 & D5 --> P7
  P6 --> P7
  P7 -- "dashboard, PDF reports" --> F
```
<div class="caption">Figure 3 — DFD Level 1</div>

# 5. System boundaries

**Inside the system (we build it):** accounts and login, receipt scanning, expenses, income, clients, invoices, tax estimator, dashboard, PDF reports, admin portal.

**Outside the system (we only connect to it or leave it out):**

- **Gemini AI** — optional helper for categories. If it is down, the app uses its own keyword rules.
- **Banks and payment apps** — not connected. Users record payments themselves.
- **Tax authority (IRS)** — the app does **not** file tax returns.
- **Email** — invoices are downloaded as PDF; the app does not send emails.

**Security boundary:** every request passes through the login check. Every database query is filtered by the logged-in user's ID, so one user can never see another user's data.

# 6. Cloud stack and why it was chosen

```mermaid
flowchart LR
  U["User's browser"] -- "HTTPS (SSL)" --> V["Vercel<br/>Next.js app + API"]
  V -- "SSL connection" --> N[("Neon<br/>PostgreSQL")]
  V -. "optional" .-> G["Google Gemini API"]
  GH["GitHub<br/>source code"] -- "push" --> CI["GitHub Actions<br/>tests & build"]
  GH -- "auto deploy" --> V
```
<div class="caption">Figure 4 — Cloud deployment</div>

| Part | Service | Why | Cost |
| --- | --- | --- | --- |
| App + API | **Vercel** | Made for Next.js, free SSL, auto-deploys from GitHub | Free tier |
| Database | **Neon PostgreSQL** | Real PostgreSQL in the cloud, works well with Vercel | Free tier |
| Testing pipeline | **GitHub Actions** | Runs tests and build on every push | Free |
| AI (optional) | **Google Gemini** | Better category suggestions | Free tier / optional |

**Total cost: $0.** Other options compared: Render, Railway, Supabase and Firebase. Firebase was not chosen because it is not a relational database, and our data (invoices, line items, payments) needs relations and transactions.

# 7. Challenges and solutions

| Challenge | Solution |
| --- | --- |
| OCR needs a lot of processing power | Run Tesseract on the server with a time limit; manual entry always available |
| Free cloud databases sleep when unused | Use Neon's pooled connection; the first request may be a little slower |
| Must keep users' data separate | Every table has a user ID and every query is filtered by it |

# 8. Plan for next week (Week 4)

- Draw the database Entity-Relationship Diagram (ERD) with indexes.
- Write the full list of REST API endpoints.
- Design wireframes for the main screens.
