# Week 8 Progress Report: Secondary Modules & Third-Party APIs

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Google Gemini AI for expense categories**
- When a user adds an expense or imports a CSV file, Gemini 2.5 Flash suggests the tax category.
- Gemini must answer in a fixed JSON format (category and confidence); the answer is checked with zod.
- 5-second time limit. If the API key is missing, or Gemini is slow, fails or returns a bad answer, the app uses its own keyword rules (for example Dell, AWS, Uber, PTCL).
- Every suggestion shows its source (AI or rules) and confidence; the user always confirms.

**Background job with notifications**
- A scheduled job runs once a day at 06:00 UTC (Vercel Cron) and only runs with a secret token.
- It deletes receipt scans that were never saved after 24 hours.
- It creates a notification when an invoice becomes overdue, and 14 days before each quarterly tax due date.
- It writes a summary to the audit log. Running it twice never creates duplicates.
- Users see a bell icon with an unread count and can mark notifications as read.

**Search, filters and batch operations**
- One search box finds the user's own expenses, clients and invoices.
- Filters by category, status and date range; sorting; page-by-page lists.
- Bulk actions: select many expenses, then delete them or change their category in one request (recorded in the audit log).
- CSV export of expenses and income for the current filter; CSV import with a preview, per-row errors and suggested categories.

**Messaging, maps and payments**
- Messaging is covered by in-app notifications. Maps are not needed for this product. Payment processing is outside the agreed scope: the app records payments but does not move money.

## 2. Evidence & Technical Verification

- AI tests with a mocked Gemini API: success, HTTP errors, timeouts, invalid answers and missing key all fall back correctly.
- Background job tests: cleanup, reminders, no duplicates on a second run, rejected without the secret.
- CSV tests: quoted fields, bad rows reported, spreadsheet formula escaping, data separation between users.
- Bulk action tests: only the user's own rows can be changed; audit entries written.
- Automated tests grew from 229 to 270, all passing. Full report: Week-08-Secondary-Modules-APIs.pdf.

## 3. Challenges & Technical Solutions

- **AI can be slow, down or return nonsense:** a 5-second limit, a strict JSON schema check and a rules fallback.
- **Scheduled jobs can run twice:** a database lock and unique notification keys make the job safe to repeat.
- **CSV files can carry spreadsheet formulas:** exported cells starting with =, +, - or @ are escaped.

## 4. Next Week Plan

- Build the protected admin portal with role-based access control.
- Add analytics charts and an audit log viewer.
- Polish the user experience: mobile layout, toast notifications, loading and error states.
