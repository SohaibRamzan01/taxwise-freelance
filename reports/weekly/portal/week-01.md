# Week 1 Progress Report: Problem Discovery & User Personas

- **Student:** Muhammad Sohaib Ramzan
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)
- **Period:** 14 to 20 October 2026

## 1. Work Completed This Week

**User research**
- Prepared a 30-minute interview guide with five parts: about the person, their last business expense, invoice to payment, quarterly tax, and an idea check.
- Studied five typical freelancer profiles: designer, software contractor, delivery driver, consultant and part-time tutor.
- Main problems found: receipts get lost, users do not know which expenses reduce tax, income is typed twice, quarterly tax is guessed, and there is no summary at tax time.

**Persona 1: Maya, Freelance Designer (28)**
- Goals: send neat invoices, get paid on time, know which purchases are business costs.
- Pain points: types every payment twice, loses software and equipment receipts, unsure how much of her internet bill she can claim.

**Persona 2: Daniel, Independent Consultant (41)**
- Goals: pay the right quarterly tax on time, have a clean report for his accountant.
- Pain points: income comes in big uneven payments, does not know if he is paying too much or too little tax, builds year-end reports by hand.

**Problem statement**
Freelancers, independent contractors and remote workers find it hard to keep track of business expenses that reduce their tax, and to work out how much tax they should pay every quarter. Their receipts, invoices and income are spread across paper, phone photos and spreadsheets, so they miss deductions, type the same data twice, and pay too much or too little tax. TaxWise Freelance solves this with one simple web app that reads receipts automatically, sorts expenses into tax-deductible categories, sends invoices, estimates quarterly tax, and creates tax-ready summary reports. The app gives estimates for planning only; it does not file tax returns or replace a tax professional.

**Five core MVP features**
- **Receipt scanning and auto-categories:** upload a receipt photo, Tesseract OCR reads vendor, date and total, and the app suggests a category such as hardware, internet or travel.
- **Expense and income tracking:** expenses with business-use percentage; income added by hand or automatically from paid invoices.
- **Invoicing:** clients, invoices with line items, status tracking and PDF download.
- **Quarterly tax estimator:** self-employment tax, income tax, amount to pay each quarter and due dates.
- **Dashboard and tax-ready reports:** totals and charts, plus a one-click PDF tax summary made with PDFKit.

## 2. Evidence & Technical Verification

- Each MVP feature has a clear "done when" check, for example: a 100 dollar expense at 80 percent business use must show an 80 dollar deduction.
- Each problem found in the research is linked to the feature that solves it.
- A full PDF report with persona cards and tables was prepared (Week-01-Problem-Discovery-User-Personas.pdf).

## 3. Challenges & Technical Solutions

- **Tax rules are complicated and change every year:** tax rules will be stored as separate data for each year so they are easy to update.
- **Users may think the app gives official tax advice:** every estimate screen will show "Estimates for planning, not tax advice".
- **OCR can misread blurry receipts:** the user always checks and confirms scanned details before saving.
- **The five profiles are typical examples:** they will be confirmed with real freelancers when the first working version is ready in Week 7.

## 4. Next Week Plan

- Write the full Software Requirements Specification (SRS) in IEEE 830 format.
- Write the use cases and draw the system use case diagram.
- Set measurable targets for speed, security and uptime.
