# TaxWise Freelance — Product

**What it is:** An expense-tracking, invoicing and quarterly-tax-planning workspace for US freelancers,
independent contractors and remote workers. Final-year project PTUT-PRJ-042 (FinTech, Personal Wealth &
Micro-Finance). Full spec: `orchestration/PROJECT.md`.

**Users:** Solo freelancers (designers, developers, writers, consultants) who juggle receipts, client
invoices and estimated tax payments without an accountant. Usage scene: a laptop at a desk or a phone
after a purchase, a few minutes at a time, often near a quarterly deadline. Mild anxiety about taxes;
they want clarity, not a lecture.

**Core jobs:** scan a receipt (Tesseract OCR) → confirm its deduction category → see deductible totals;
invoice clients and record income when paid; estimate quarterly federal tax (SE tax, brackets, QBI,
safe harbour) and log payments; download tax-ready PDF summaries (PDFKit).

**Voice:** calm, plain, precise. Money and dates are exact. Every tax figure is an estimate for planning,
not tax advice — the disclaimer always stays visible.

**Truth constraints:** free student project; no bank connection; fictional sample data must be labelled
as sample; never claim users, ratings, savings or testimonials that do not exist.

**Surfaces & modes:** landing page `/` = Persuade. Auth `/login` `/signup` = Operate. Workspace
(dashboard, expenses, income, invoices, clients, tax estimator, estimated payments, reports, settings,
admin) = Operate.

**Incumbent visual world:** navy ink + highlighter yellow on cool paper, receipt/document metaphor,
Bricolage Grotesque display, Geist text, Geist Mono for figures; light and dark themes. Tokens in
`src/app/globals.css` (see `orchestration/reports/011-finsight-ui-redesign.md`).
