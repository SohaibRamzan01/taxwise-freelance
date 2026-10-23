# Week 9 Progress Report: Admin Workstation & Consumer UX Polish

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Protected admin portal with role-based access control (RBAC)**
- Only users with the ADMIN role can open the admin portal.
- Every admin request checks the user's current role and status in the database, not only the login token, so a role change works immediately.
- Users page: search and page through users, change a role, enable or disable an account.
- An admin cannot demote or disable their own account, so the platform can never lose all admins.
- Audit log viewer with filters: logins, deletes, bulk actions, role changes and background job runs.

**Analytics (telemetry) charts**
- Platform totals: accounts, active users in the last 30 days, invoices, invoice value, expenses logged.
- Three weekly charts for the last 12 weeks: activity (sign-ups, active users, expenses), invoices created, and invoice value.
- Each chart has a matching data table for screen-reader users.

**User experience polish**
- Mobile layout: a menu button on small screens, and wide tables turn into easy-to-read cards.
- Toast messages after every save, delete, import or error.
- "Are you sure?" dialogs before deleting, voiding or un-paying.
- Skeleton loaders, friendly 404 and error pages, and empty-state messages.
- Accessibility: labels on all inputs, visible keyboard focus and a "skip to content" link.
- The two tax figures now use the same clear labels on every page with a one-line explanation.

## 2. Evidence & Technical Verification

- Admin access tests: normal users get 403 on every admin route; disabled or demoted admins lose access immediately.
- Self-protection tests: an admin cannot demote or disable their own account.
- Visual check: all 13 screens opened at desktop (1366 px) and phone (390 px) size; all load, no console errors, no sideways scrolling.
- Issues found in the visual check and fixed: sidebar height, a missing deductible column, a confusing quarterly status, a missing site icon, and two tax figures that looked contradictory.
- All automated tests and the production build pass. Full report with screenshots: Week-09-Admin-Portal-UX.pdf.

## 3. Challenges & Technical Solutions

- **A login token could still say admin after the role was removed:** admin checks read the current role from the database on every request.
- **Charts are hard for screen-reader users:** each chart has a matching data table.
- **Wide tables do not fit on phones:** tables switch to a card layout below tablet width.

## 4. Next Week Plan

- Raise and enforce test coverage on the core logic (target at least 70 percent).
- Run static security scans and fix dependency vulnerabilities.
- Review every input against the OWASP Top 10 risks.
