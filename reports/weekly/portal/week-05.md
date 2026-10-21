# Week 5 Progress Report: Project Scaffolding & Core Auth Layer

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Repository and branch protection**
- Code is on GitHub: github.com/SohaibRamzan01/taxwise-freelance (public so it can be reviewed).
- The main branch is protected: changes go through a pull request; force-push and branch deletion are blocked.
- Secrets are kept in a .env file that is never uploaded; .env.example lists the needed settings.

**Project structure**
- src/app: pages and API routes. src/components: reusable screen parts. src/lib: core logic. prisma: database schema, migrations and demo data. docs: design documents.
- Tools: Next.js 16 (React + Node.js), TypeScript, Tailwind CSS, Prisma 7, PostgreSQL, Vitest, ESLint.

**Database connection**
- PostgreSQL connected through Prisma; the first migration created all tables from the Week 4 ERD.
- The database itself blocks one user's invoice from pointing to another user's client.
- Health check endpoint reports app and database status. A seed script adds demo data.

**Secure multi-tenant login**
- Sign up, log in, log out and "who am I" endpoints.
- Passwords stored only as bcrypt hashes (cost 12).
- Session is a signed JWT in a secure, httpOnly cookie that expires after 7 days.
- Limits on login and sign-up attempts; origin check on every request that changes data.
- Logged-out users are sent to the login page; every query is filtered by the logged-in user's ID.
- USER and ADMIN roles; sign-up, login and logout are recorded in an audit log.
- Wrong email and wrong password show the same message, so attackers learn nothing.

## 2. Evidence & Technical Verification

- Lint: passed. TypeScript strict type check: passed. Production build: passed.
- Automated tests: 29 passed (hashing, tokens, validation, routes, middleware).
- Test coverage on core logic: 97.6 percent of lines (target 70 percent).
- Live smoke test against the running app: 49 checks passed, including sign up, login, logout, cookie settings, protected pages, rate limiting and blocking access to another user's data.
- Full report with the login flow diagram: Week-05-Scaffolding-Auth.pdf.

## 3. Challenges & Technical Solutions

- **Free GitHub accounts do not enforce branch protection on private repos:** the repository was made public (it contains no secrets).
- **The existing database server on port 5432 had different login details:** a separate project database on port 5433 was used, with settings kept in .env.
- **Next.js warns that middleware will be renamed to proxy:** it works correctly now and will be renamed later.

## 4. Next Week Plan

- Build the tax calculation engine (self-employment tax, income tax, quarterly payments).
- Build expenses, income, clients and invoices with full server-side validation.
- Connect everything end to end: screen, API and database.
