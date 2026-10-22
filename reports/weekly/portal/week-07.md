# Week 7 Progress Report: Mid-Term Progress Report & Live Working Prototype

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Working prototype ready for the live demonstration**
- A freelancer can sign up, scan a receipt, see the deductible amount, send and track invoices, get a quarterly tax estimate, and download a tax-ready PDF report.
- Realistic demo data was added: a full 2026 year with about 82,000 dollars of income, 48 expenses across all categories, receipt photos and quarterly tax payments, plus an admin demo account.

**End-to-end smoke test of the full user journey: 14 of 14 steps pass**
- Health check, sign up, create client, create invoice, mark invoice paid (exactly one income entry created).
- Scan a sample receipt with real Tesseract OCR, save the reviewed expense, fetch the private receipt image.
- Tax estimate, download the tax summary PDF made with PDFKit.
- Notifications work and a normal user is blocked from admin pages.
- Clean up of test data and log out.

**Mid-Term Progress Report and Slide Deck**
- Mid-term progress report written (Week-07-Midterm-Progress-Report.pdf).
- 15-slide presentation with speaker notes: problem, personas, the five features, architecture, receipt flow, tax engine example, live screenshots, security, quality, progress and next steps.
- A 6-minute live demo script was prepared.

**Progress against the 12-week plan**
- Weeks 1 to 7: done.
- Weeks 8 to 10 (Gemini AI, search, bulk actions, background job, admin portal, mobile polish, tests and security audit): already built early.
- Week 11: CI pipeline done; cloud deployment is next. Week 12: final report and viva planned.

## 2. Evidence & Technical Verification

- Smoke test result against the real running app: 14 of 14 steps PASS.
- Automated tests: 289 passing. Line coverage on core logic: about 99 percent (target 70 percent).
- 53 API handlers across 36 routes; 13 screens.
- 0 known vulnerabilities in production packages.
- GitHub Actions runs lint, type checks, all tests, a production build and the smoke test on every push.
- Code: github.com/SohaibRamzan01/taxwise-freelance

## 3. Challenges & Technical Solutions

- **Two tax figures looked contradictory on the dashboard:** they measure different things (tax still owed versus the safe-harbour payment target). Both screens now use the same clear labels with a one-line explanation.
- **Phone receipt photos can be larger than the free hosting upload limit:** photos are now shrunk in the browser before upload.
- **A local database port clash with another project:** the project database was moved to its own port and folder.
- **User profiles are not yet confirmed with real freelancers:** short testing sessions are planned for Weeks 8 and 9.

## 4. Next Week Plan

- Deploy the app to Vercel with a Neon PostgreSQL database and SSL; run the smoke test against the live URL.
- Start testing with real freelancers and apply the supervisor's midterm feedback.
