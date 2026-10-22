---
title: Week 7 Report — Mid-Term Progress Report (Live Prototype Gate)
milestone: Mid-Term Progress Report · Live Working Prototype
slug: Midterm-Progress-Report
---

# 1. Summary

TaxWise Freelance is a **working prototype**. A freelancer can sign up, scan a receipt, see the deductible amount, send and track invoices, get a quarterly tax estimate, and download a tax-ready PDF report. A full end-to-end test of this journey passes, and the prototype is ready for the live demonstration.

<div class="glance">
<div><b>14/14</b><span>end-to-end journey steps passing</span></div>
<div><b>289</b><span>automated tests passing</span></div>
<div><b>99%</b><span>test coverage on core logic</span></div>
</div>

| Task from the plan | Status |
| --- | --- |
| End-to-end smoke test of the full user journey | Done — 14 of 14 steps pass (section 4) |
| Mid-Term Progress Report | Done — this document |
| Mid-Term Slide Deck | Done — 15 slides with speaker notes |
| Live demonstration for the supervisor | Ready — demo script in section 8 |

# 2. Progress against the 12-week plan

The core product is finished ahead of schedule. Several later milestones (Weeks 8–10) are already built, which leaves time for deployment, real-user testing and the final report.

| Week | Milestone | Status |
| --- | --- | --- |
| 1 | Problem discovery & personas | Done |
| 2 | Software Requirements Specification | Done |
| 3 | Architecture & cloud topology | Done |
| 4 | Database, API & wireframes | Done |
| 5 | Scaffolding & secure login | Done |
| 6 | Tax engine, OCR, invoices, PDF reports | Done |
| **7** | **Midterm: live prototype** | **Done — this report** |
| 8 | Gemini AI, search, bulk actions, background job | Built early |
| 9 | Admin portal, charts, mobile polish | Built early |
| 10 | Tests ≥ 70% coverage, security audit | Built early (99%) |
| 11 | CI pipeline & cloud deployment | CI done · deployment next |
| 12 | Final report & viva | Planned |

# 3. What the prototype does

| Feature (from the project description) | What works now |
| --- | --- |
| Automatically categorise receipts (hardware, internet, travel) | Upload or photograph a receipt → **Tesseract OCR** reads vendor, date and total → category suggested by rules or **Gemini AI** → user confirms |
| Track tax-deductible expenses | 17 categories; deductible = amount × business-use % × category factor (meals 50%) |
| Invoicing | Clients, line items, INV-0001 numbering, Draft/Sent/Paid/Overdue/Void, invoice PDF; paid invoices become income automatically |
| Calculate quarterly tax liabilities | Self-employment tax, income tax, QBI, safe harbour, quarterly plan with Paid / Past due / Upcoming status |
| Tax-ready summary reports | Year or quarter **PDF made with PDFKit**, plus CSV |
| Extra | Dashboard with charts, search, filters, CSV import/export, bulk actions, notifications, admin portal |

<img class="shot" src="../assets/screens/dashboard-desktop-top.png" alt="Dashboard">
<div class="caption">Figure 1 — Dashboard with a full demo year: about $82,000 income and 48 expenses</div>

# 4. End-to-end smoke test

The smoke test runs the whole journey against the **real running app** (production build, real database, real OCR). It creates a throwaway account and cleans up after itself.

| # | Step | Result |
| --- | --- | --- |
| 1 | Health check (app + database) | PASS |
| 2 | Sign up a new user | PASS |
| 3 | Create a client | PASS |
| 4 | Create an invoice | PASS |
| 5 | Mark invoice paid → exactly one income entry created | PASS |
| 6 | Scan a sample receipt with real Tesseract OCR | PASS |
| 7 | Save the reviewed expense and fetch the private receipt image | PASS |
| 8 | Tax estimate | PASS |
| 9 | Download the tax summary PDF | PASS |
| 10 | Notifications; normal user blocked from admin pages | PASS |
| 11–13 | Clean up expenses, invoices and clients | PASS |
| 14 | Log out | PASS |

The same test also runs automatically on GitHub Actions on every push, together with lint, type checks, 289 unit tests and a production build.

# 5. Key numbers

| Measure | Value |
| --- | --- |
| Automated tests | 289 passing |
| Line coverage on core logic (`src/lib`) | ≈ 99% (target 70%) |
| API endpoints | 53 handlers across 36 routes |
| Screens | 13 (login, sign up, dashboard, expenses, income, clients, invoices, invoice print view, tax estimator, tax payments, reports, settings, admin) |
| Known vulnerabilities in production packages | 0 |
| Monthly running cost (planned) | $0 |

# 6. Risks and how they are handled

| Risk | Plan |
| --- | --- |
| OCR misreads blurry receipts | User always reviews scanned details; manual entry always available |
| Free cloud tiers have limits (upload size, cold starts) | Phone photos are shrunk before upload; Neon pooled connection; health check |
| Tax rules change each year | Rules are data files per year; the engine is tested with hand-checked numbers |
| User profiles not yet confirmed with real freelancers | Short testing sessions with real freelancers planned for Weeks 8–9 |

# 7. Plan for the rest of the semester

- **Week 8:** deploy to Vercel + Neon with SSL; run the smoke test against the live URL.
- **Weeks 8–9:** test with real freelancers and apply supervisor feedback from the midterm.
- **Weeks 10–11:** final security review, performance check against the latency target, production health checks.
- **Week 12:** final FYP report, final slides and viva preparation.

<div class="pb"></div>

# 8. Live demo script (about 6 minutes)

**Before the demo:** start the database and the app, open the browser at the login page, and keep `public/samples/hardware.png` ready.

1. **Log in** as the demo user (`demo@taxwise.example`). Point out the dashboard: income, expenses, deductions, tax still owed, and the monthly chart.
2. **Expenses → Scan receipt.** Upload `hardware.png`. Show that OCR filled in the vendor, date and total, and that the category is *Computer hardware & equipment* with an "auto" badge. Click **Save**.
3. **Show the deductible column.** Point at the new row, then at *PTCL $80 at 75% → $60* and a meal counted at 50%.
4. **Invoices.** Find **INV-0014 (Northline Studio, Sent)** and click **Mark paid**. Open **Income** to show the new income entry was created automatically.
5. **Tax Estimator.** Show the line-by-line calculation, the quarterly plan (Q1–Q2 Paid, Q3 Past due $150, Q4 Upcoming) and the two figures: *tax still owed* vs *payment target still due* (safe harbour).
6. **Reports.** Choose 2026 and click **Download PDF** — open the tax-ready summary.
7. **(Optional) Admin.** Log out and log in as `admin@taxwise.example` to show the analytics charts and audit log; a normal user gets "forbidden".

**If something fails:** run `npm run smoke -- http://localhost:3000` — it shows the same journey passing step by step.
