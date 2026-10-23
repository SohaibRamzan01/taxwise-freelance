# Week 10 Progress Report: Automated Testing & Security Audits

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Automated test suite (target: at least 70 percent coverage on core logic)**
- 296 automated tests passing.
- Coverage on the core logic: lines 99.62 percent, statements 99.20 percent, functions 98.77 percent, branches 96.32 percent.
- The 70 percent target is enforced: the test run fails if coverage drops below it.
- Tests cover the tax engine (hand-checked examples, every bracket boundary), data separation between users for every resource, admin access, input validation, real OCR on sample receipts, fake image rejection, AI fallback and the background job.

**OWASP Top 10 (2021) review of every API route**
- A01 Access control: every query filtered by the logged-in user; admin role checked in the database; origin check on changes.
- A02 Cryptography: bcrypt passwords (cost 12), signed JWT in httpOnly Secure cookies, HTTPS with HSTS.
- A03 Injection: zod checks every input, Prisma uses safe parameters, no raw HTML rendering, CSV formulas escaped.
- A04 Insecure design: the server calculates all totals; a paid invoice creates exactly one income row.
- A05 Misconfiguration: Content-Security-Policy, frame blocking, nosniff, referrer policy, generic error messages.
- A06 Vulnerable components: locked dependency versions, npm audit, CI on every push.
- A07 Authentication: login rate limit, the same error for wrong email or password, disabled accounts blocked.
- A08 Data integrity: CI installs from the lockfile; AI answers are schema-checked; OCR language data is bundled.
- A09 Logging: audit log for logins, deletes, role changes and job runs; no passwords or tokens in logs.
- A10 SSRF: the server never fetches user-supplied URLs.

**Static scan and dependency audit**
- ESLint security plugin: 0 errors and 27 warnings, each reviewed by hand.
- npm audit on production packages: 0 vulnerabilities.
- 5 high advisories remain in a development-only lint tool (braces); no compatible fix exists yet and it is not shipped to users.
- Secret scan: no passwords, keys or tokens in the code or Git history.

**Extra input protection added**
- Request size limits while reading JSON, upload checks by real file signature, and bounded number patterns in the receipt and money parsers.

## 2. Evidence & Technical Verification

- Coverage report: 99.62 percent lines on src/lib, enforced in the test configuration.
- Full OWASP table with file references: docs/week-10-security-testing.md in the repository.
- Full report: Week-10-Testing-Security.pdf.

## 3. Challenges & Technical Solutions

- **A development-only package has an advisory with no compatible fix:** documented and tracked; it is not part of the deployed app.
- **The login rate limit is per server instance:** documented as a known limit; a shared store is recommended for large-scale use.
- **Database tests are slow:** they run in CI with a PostgreSQL container and are opt-in locally.

## 4. Next Week Plan

- Deploy the app to a live public URL with SSL (Vercel and Neon).
- Run the GitHub Actions CI pipeline on every push.
- Verify the production health checks with a live end-to-end test.
