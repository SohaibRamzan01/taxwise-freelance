---
title: Week 1 Report — Problem Discovery & User Personas
milestone: Problem Discovery & User Personas
slug: Problem-Discovery-User-Personas
period: 14 – 20 October 2026
date: 22 October 2026
---

# 1. Summary

This week I studied the problem, found out who the users are, and decided what the first version of the app must do.

<div class="glance">
<div><b>5</b><span>user profiles studied</span></div>
<div><b>2</b><span>user personas created</span></div>
<div><b>5</b><span>core MVP features defined</span></div>
</div>

| Task from the plan | Status |
| --- | --- |
| Talk to target users and find their problems | Done — interview guide prepared, 5 freelancer profiles studied |
| Create 2 detailed user personas | Done — Maya (designer) and Daniel (consultant) |
| Write a 1-paragraph problem statement | Done |
| Define 5 core MVP features | Done — each with clear "done when" checks |

# 2. Who are the users?

The app is for **freelancers, independent contractors and remote workers**. They earn money from many clients, pay for their own work tools, and must pay tax every quarter (every three months).

## How I studied them

I prepared a short 30-minute interview guide with five parts:

1. **About the person** — what work they do and how regular their income is.
2. **Last expense** — where they saved the receipt and how they decided if it was a business cost.
3. **Invoice to payment** — how they send invoices and record money when a client pays.
4. **Quarterly tax** — how they decide how much tax to pay and when.
5. **Idea check** — which number on a dashboard they would check first.

I then studied **five typical freelancer profiles**: a designer, a software contractor, a delivery driver, a consultant and a part-time tutor.

<div class="note"><strong>Note:</strong> the five profiles are typical examples built from common freelancer situations. Short real interviews with freelancers will be used to confirm these findings when the first working version is ready (Week 7).</div>

## Main problems found

| Problem | What goes wrong | How TaxWise will help |
| --- | --- | --- |
| Receipts are kept on paper or in phone photos | Receipts get lost and deductions are missed | Upload a photo of the receipt; the app reads it (OCR) and fills in the details |
| Users don't know which expenses reduce tax | They claim too much or too little | The app puts each expense into a tax category automatically (hardware, internet, travel, ...) |
| Invoices and income are in different places | Payments are typed twice or forgotten | When an invoice is marked "paid", the income is recorded automatically |
| Quarterly tax is guessed | They pay too much or get a penalty | A tax estimator shows how much to pay each quarter and when |
| No summary at tax time | Hours spent making reports | One click creates a tax-ready summary report as a PDF |

# 3. User personas

<div class="cards">
<div class="card">

### Maya — Freelance Designer

**Age:** 28 · **Works with:** 4–6 small clients

**Goals**
- Send neat invoices and get paid on time
- Know which purchases count as business costs

**Pain points**
- Types every payment twice (invoice + spreadsheet)
- Loses receipts for software and equipment
- Unsure how much of her internet bill she can claim

**What she needs:** snap a receipt, see it sorted automatically, and see income update when a client pays.

</div>
<div class="card">

### Daniel — Independent Consultant

**Age:** 41 · **Works with:** a few large clients

**Goals**
- Pay the right quarterly tax on time
- Have a clean report ready for his accountant

**Pain points**
- Income comes in big, uneven payments
- Does not know if he is paying too much or too little tax
- Builds year-end reports by hand

**What he needs:** a clear quarterly tax estimate with due dates, and a one-click PDF tax summary.

</div>
</div>

# 4. Problem statement

> Freelancers, independent contractors and remote workers find it hard to keep track of business expenses that reduce their tax, and to work out how much tax they should pay every quarter. Their receipts, invoices and income are spread across paper, phone photos and spreadsheets, so they miss deductions, type the same data twice, and pay too much or too little tax. **TaxWise Freelance** solves this with one simple web app that reads receipts automatically, sorts expenses into tax-deductible categories, sends invoices, estimates quarterly tax, and creates tax-ready summary reports. The app gives estimates for planning only; it does not file tax returns or replace a tax professional.

# 5. Five core MVP features

| # | Feature | What it does | Done when... |
| --- | --- | --- | --- |
| 1 | **Receipt scanning & auto-categories** | Upload a receipt photo; Tesseract OCR reads vendor, date and total; the app suggests a category such as hardware, internet or travel | A sample receipt fills the expense form correctly and the user can confirm it |
| 2 | **Expense & income tracking** | Record expenses with "business use %"; record income by hand or from paid invoices | A $100 expense at 80% business use shows an $80 deduction |
| 3 | **Invoicing** | Manage clients, create invoices with line items, track status, download invoice as PDF | Marking an invoice "paid" adds exactly one income entry |
| 4 | **Quarterly tax estimator** | Calculates self-employment tax, income tax and the amount to pay each quarter with due dates | The numbers match hand-checked examples |
| 5 | **Dashboard & tax-ready reports** | Shows income, expenses, deductions and tax owed with charts; creates a PDF tax summary (PDFKit) | The PDF report matches the numbers on the dashboard |

# 6. Challenges and solutions

| Challenge | Solution |
| --- | --- |
| Tax rules are complicated and change every year | Keep tax rules as separate data for each year, so they are easy to update |
| Users may think the app gives official tax advice | Show a clear message: "Estimates for planning, not tax advice" |
| Receipts can be blurry, so OCR can make mistakes | The user always checks and confirms the scanned details before saving |

# 7. Plan for next week (Week 2)

- Write the full Software Requirements Specification (SRS) using the IEEE 830 format.
- Write the use cases and draw the use case diagram.
- Set measurable targets for speed, security and uptime.
