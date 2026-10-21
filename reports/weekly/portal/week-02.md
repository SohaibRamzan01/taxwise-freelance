# Week 2 Progress Report: Software Requirements Specification (SRS)

- **Student:** Muhammad Sohaib Ramzan
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)
- **Period:** 21 to 27 October 2026

## 1. Work Completed This Week

**IEEE 830 SRS document written**, with four parts: introduction, overall description, specific requirements and use cases.

**Scope:** a web app where freelancers scan receipts, track expenses and income, send invoices, estimate quarterly tax and download tax-ready PDF reports. It does not file tax returns, move money or connect to bank accounts.

**14 functional requirements, including:**
- Secure sign up and login; each user sees only their own data.
- Add, edit and delete expenses with category and business-use percentage.
- Upload a receipt photo and read vendor, date and total with Tesseract OCR.
- Suggest a tax category automatically (hardware, internet, travel, software, meals and more).
- Deductible amount = amount times business-use percentage times category factor (meals 50 percent).
- Income added by hand or automatically when an invoice is marked paid.
- Clients and invoices with line items, tax, discount, auto numbers and status (Draft, Sent, Paid, Overdue, Void).
- Invoices and tax summary reports generated as PDF files with PDFKit.
- Quarterly tax estimate with due dates, and a log of tax payments made.
- Dashboard, search, filters, CSV import and export, and an admin portal.

**10 use cases with a system use case diagram:**
- UC-01 Sign up / Log in, UC-02 Record an expense, UC-03 Scan a receipt, UC-04 Record income, UC-05 Manage clients
- UC-06 Create and send invoice, UC-07 Mark invoice paid, UC-08 Estimate quarterly tax, UC-09 Download tax-ready report, UC-10 Manage users (admin)

**10 measurable non-functional requirements, including:**
- **Speed:** 95 percent of requests answer in under 300 ms.
- **Receipt scanning:** a receipt is read in under 10 seconds.
- **Uptime:** 99.5 percent per month, checked by a health endpoint.
- **Security:** bcrypt password hashing (cost 12), JWT cookie that expires in 7 days, max 5 login attempts per 15 minutes, OWASP Top 10 protection.
- **Privacy:** a user can never see another user's data.
- **Mobile:** works on screens from 320 px to 1440 px.
- **Testing:** at least 70 percent test coverage on core logic.

## 2. Evidence & Technical Verification

- Every requirement has an ID (FR-01 to FR-14, NFR-01 to NFR-10) so it can be traced to code and tests later.
- Each use case lists the actor, starting condition, main steps, other paths and end result.
- The tax formulas include worked example numbers so they can be tested.
- Full SRS with the use case diagram is in the PDF report (Week-02-SRS.pdf).

## 3. Challenges & Technical Solutions

- **Tax rules have many small details:** exact formulas and example numbers were written into the SRS.
- **OCR is not always correct:** the user must confirm scanned data before it is saved (UC-03).
- **A double click could record income twice:** marking an invoice paid must be safe to repeat (UC-07).

## 4. Next Week Plan

- Draw the 3-tier architecture diagram (client, API server, database).
- Draw Data Flow Diagrams Level 0 and Level 1.
- Define system boundaries and choose the cloud services.
