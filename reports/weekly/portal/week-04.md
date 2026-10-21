# Week 4 Progress Report: Database Modeling & UI Wireframes

- **Student:** Muhammad Sohaib Ramzan
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)
- **Period:** 4 to 10 November 2026

## 1. Work Completed This Week

**Database design (ERD with 9 tables)**
- Tables: User, Client, Invoice, InvoiceItem, Expense, Receipt, Income, EstimatedPayment, AuditLog.
- Every table has a userId, so each user's data stays separate (multi-tenant).
- Money is stored in cents (whole numbers), so totals never have rounding errors.
- Invoice numbers are unique per user (INV-0001, INV-0002 and so on).
- One paid invoice creates exactly one income row; the database blocks a second one.

**Indexes (to make searches fast)**
- User: email (unique), for fast login and no duplicate accounts.
- Expense: userId + date, and userId + category, for date filters and the deductions chart.
- Invoice: userId + number (unique), userId + status, userId + dueDate, for unpaid and overdue lists.
- Income: userId + date, and invoiceId (unique), so a paid invoice adds income only once.
- EstimatedPayment: userId + taxYear + quarter. AuditLog: userId + createdAt.

**REST API (30+ endpoints, all JSON)**
- Auth: sign up, log in, log out, current user.
- Expenses: list with search, filter, sort and pages; add, edit, delete.
- Receipts: upload and scan a receipt photo; view the saved photo.
- Income, clients and invoices: full create, read, update and delete; mark invoice paid; download invoice PDF.
- Tax: quarterly estimate, log tax payments. Reports: download the tax-ready summary PDF.
- Dashboard data, admin user management, admin statistics, audit log and a health check.
- All errors use one shape: error code plus message.

**Wireframes for 6 screens**
- Login and sign up
- Dashboard (totals, income vs expenses chart, deductions chart, unpaid invoices, next tax date)
- Expenses with Scan Receipt (photo preview, details filled in, suggested category, save)
- Invoice editor (client, dates, line items, totals, mark paid, download PDF)
- Tax estimator (breakdown, quarterly schedule, record payment, disclaimer)
- Reports and admin portal

## 2. Evidence & Technical Verification

- The ERD, index list, endpoint list and all six wireframes are in the PDF report (Week-04-Database-API-Wireframes.pdf).
- Every endpoint is linked to a use case from the Week 2 SRS.
- The database design was turned into a Prisma schema and migration, ready for Week 5.

## 3. Challenges & Technical Solutions

- **Storing receipt photos for free:** photos are saved inside PostgreSQL, so no paid file storage is needed.
- **A saved "Overdue" status can go out of date:** it is worked out from the due date each time an invoice is read.
- **Simple screens on phones:** each wireframe has a one-column mobile layout, and tables become cards.

## 4. Next Week Plan

- Set up the Git repository with branch protection and the project folders.
- Connect to the PostgreSQL database and run the first migration.
- Build secure sign up and login with bcrypt password hashing and a JWT session cookie.
