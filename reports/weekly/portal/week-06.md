# Week 6 Progress Report: Core Business Logic & Vertical Slice

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Tax calculation engine (core business logic)**
- Calculates self-employment tax, the half-SE deduction, standard deduction, QBI deduction, income tax by brackets, total tax for the year, and the amount to pay each quarter with due dates.
- Built as pure functions with no database or internet inside, so the same input always gives the same answer.
- All money is stored in whole cents, so there are no rounding mistakes.
- The 2026 tax rules live in one data file, so a new year only needs a new file.
- Hand-checked example (single filer, 100,000 dollars profit): SE tax 14,129.55, income tax 8,235.00, total 22,364.55 dollars. The test checks these exact numbers.

**Receipt scanning and automatic categories (Tesseract OCR)**
- The user uploads or photographs a receipt; the server checks it is a real image under 5 MB.
- Tesseract OCR reads the text; a parser finds the vendor, date and total.
- A rules engine suggests the category, for example Dell to Computer hardware, PTCL to Internet and phone, Uber to Travel.
- The user confirms and saves; the receipt photo is stored with the expense. If OCR fails, the user can type the details.

**Invoices and PDF reports (PDFKit)**
- Clients and invoices with line items, discount and tax; numbers like INV-0001 per user.
- Status flow Draft, Sent, Paid, Overdue, Void. Marking an invoice paid adds exactly one income entry, even if clicked twice.
- PDFKit creates a downloadable invoice PDF and a tax-ready summary report for a year or quarter, with deductions grouped by Schedule C line.

**Validation, error handling and the vertical slice**
- Every API input is checked with zod; unknown fields are rejected.
- All errors use one format: an error code and a message.
- Every query is limited to the logged-in user, and deletes are recorded in the audit log.
- All main screens (dashboard, expenses, income, clients, invoices, tax estimator, reports, settings) now work end to end: screen, API and database.

## 2. Evidence & Technical Verification

- Lint, TypeScript strict check and production build: passed.
- Automated tests: 170 passed, including real OCR on sample receipt images.
- Test coverage on core logic: 99 percent of lines (target 70 percent).
- Live journey test passed: sign up, add client, create invoice, mark paid, scan receipt, save expense, tax estimate, download invoice and tax summary PDFs.
- Data separation test passed: a second user cannot read, change or delete the first user's records.
- Screenshots of the working screens are in the PDF report (Week-06-Core-Logic-Vertical-Slice.pdf). Code: github.com/SohaibRamzan01/taxwise-freelance

## 3. Challenges & Technical Solutions

- **OCR text is messy:** the parser looks for TOTAL or AMOUNT DUE lines first, then the largest amount, and the user always confirms.
- **Two clicks on Mark paid could add income twice:** the database allows only one income row per invoice and the update runs in one transaction.
- **Tesseract and PDFKit need extra files on the server:** the build includes the OCR language data and PDF fonts, and a check confirms they are bundled.

## 4. Next Week Plan

- Run a full end-to-end test of the user journey with realistic demo data.
- Write the mid-term progress report and slide deck.
- Give the live demonstration to the supervisor.
