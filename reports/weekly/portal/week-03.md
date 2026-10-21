# Week 3 Progress Report: High-Level Architecture & Cloud Topology

- **Student:** Muhammad Sohaib Ramzan
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)
- **Period:** 28 October to 3 November 2026

## 1. Work Completed This Week

**3-tier architecture designed**
- **Tier 1, Client:** React pages (Next.js) with Tailwind CSS and Recharts charts, running in the browser.
- **Tier 2, API server:** Node.js (Next.js route handlers, TypeScript). Handles login and security, input checks, tax calculations, receipt reading with Tesseract OCR, and PDF creation with PDFKit.
- **Tier 3, Database:** PostgreSQL, accessed through the Prisma ORM.
- Each tier only talks to the tier next to it, over HTTPS with JSON.

**Data Flow Diagram Level 0:** the whole system as one process, exchanging data with the Freelancer, the Admin and the optional Gemini AI service.

**Data Flow Diagram Level 1:** seven processes (manage account, scan receipt, manage expenses, manage clients and invoices, record income, calculate tax, create reports) and six data stores (users, receipts, expenses, clients and invoices, income, tax payments).

**System boundaries**
- Inside the system: accounts, receipt scanning, expenses, income, invoices, tax estimator, dashboard, PDF reports, admin portal.
- Outside the system: Gemini AI (optional), banks (not connected), the tax authority (no tax filing), email (invoices are downloaded as PDF).
- Security boundary: every request passes the login check, and every database query is filtered by the logged-in user's ID.

**Cloud stack (total cost 0 dollars)**
- **Vercel:** hosts the app and API; made for Next.js; free SSL; deploys automatically from GitHub.
- **Neon PostgreSQL:** cloud database on a free tier; works well with Vercel.
- **GitHub Actions:** runs tests and the build on every push.
- **Google Gemini (optional):** better category suggestions on a free tier.
- Also compared: Render, Railway, Supabase and Firebase. Firebase was not chosen because our data needs a relational database with transactions.

## 2. Evidence & Technical Verification

- Four diagrams prepared: 3-tier architecture, DFD Level 0, DFD Level 1 and cloud deployment.
- Every data store in the DFD matches a table planned for the database (Week 4).
- Full diagrams are in the PDF report (Week-03-Architecture-Cloud-Topology.pdf).

## 3. Challenges & Technical Solutions

- **OCR needs a lot of processing power:** Tesseract runs on the server with a time limit, and manual entry is always available.
- **Free cloud databases sleep when unused:** use Neon's pooled connection; only the first request is a little slower.
- **Keeping users' data separate:** every table has a user ID and every query is filtered by it.

## 4. Next Week Plan

- Draw the database Entity-Relationship Diagram (ERD) with indexes.
- Write the full list of REST API endpoints.
- Design wireframes for the main screens.
