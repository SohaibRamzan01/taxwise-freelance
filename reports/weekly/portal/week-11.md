# Week 11 Progress Report: Zero-Cost Cloud Deployment & CI/CD

- **Student:** Muhammad Sohaib Ramzan (Roll No. 24-ST-004)
- **Supervisor:** Dr. Zaigham Mushtaq
- **Department:** Software Engineering Technology (Section A)
- **Project:** PTUT-PRJ-042, TaxWise Freelance (Automated Tax Deductions & Invoicing Platform)

## 1. Work Completed This Week

**Live deployment with SSL**
- Live URL: https://taxwise-freelance.vercel.app (HTTPS).
- App and API on Vercel (Hobby, free). Database: Neon PostgreSQL (free, Washington D.C.), created through Vercel's Neon integration.
- Database addresses were added automatically by the integration; secrets are stored as encrypted Vercel environment variables, never in Git.
- Preview deployments use their own database branch, so tests never touch live data.
- The daily background job runs on Vercel Cron with a secret token.
- Total hosting cost: 0 dollars per month.

**CI/CD pipeline on GitHub Actions**
- Runs on every push and pull request with Node 22 and a PostgreSQL 17 container.
- Steps: install exact dependencies, apply database migrations, lint, type check, all tests with the 70 percent coverage gate, production build, bundle check with real OCR, and a full journey test with real OCR and PDF.
- After CI, Vercel builds and deploys the same commit automatically; the build applies database migrations.

**Production health checks**
- The health endpoint reports app and database OK on the live site.
- Live end-to-end test: 14 of 14 steps pass, including sign up, invoice, mark paid, real OCR receipt scan, saving the expense, tax estimate, tax-ready PDF, access control, cleanup and logout.
- Security headers present on the live site: HSTS, Content-Security-Policy, X-Frame-Options DENY and nosniff.

## 2. Evidence & Technical Verification

- Live site: https://taxwise-freelance.vercel.app
- Latest CI run: green, about 1 minute 30 seconds per push.
- Live smoke test result: 14 of 14 PASS.
- Full report with screenshots of the live site and the CI run: Week-11-Deployment-CI-CD.pdf. Deployment runbook: docs/week-11-deployment.md.

## 3. Challenges & Technical Solutions

- **Receipt scanning worked locally but failed on Vercel (error 422):** Vercel only uploads the files it detects, and three OCR files were missing. They are now listed in the build configuration, and a new check runs OCR using only the deployed files so this cannot happen again.
- **The real OCR error was hidden:** failures are now logged as one structured line with no images or user data.
- **A database SSL warning in the logs:** the connection now uses full certificate verification explicitly.
- **Vercel limits uploads to 4.5 MB:** phone photos are resized in the browser before upload.

## 4. Next Week Plan

- Write the final FYP report following the academic rubric.
- Prepare the final presentation slides and the live defense demonstration.
- Apply final polish from supervisor feedback.
