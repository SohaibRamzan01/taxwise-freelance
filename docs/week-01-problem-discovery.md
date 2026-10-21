# Week 1 — problem discovery

## 1. Research purpose and method

TaxWise Freelance studies how freelancers connect receipts, client payments, deductible expenses, and quarterly estimated taxes. The research should establish whether one workflow reduces duplicate entry and makes estimates understandable. The target population is US freelancers, independent contractors, and remote workers with self-employment income; tax professionals are contextual stakeholders, not the primary operators.

### Interview plan

Recruit five participants across creative, technical, consulting, delivery, and tutoring work. Include different income regularity, expense volume, and spreadsheet experience. Recruitment should avoid collecting Social Security numbers, bank credentials, real invoices, or tax returns. Obtain consent, offer withdrawal, anonymise notes, and use redacted examples. A student researcher conducts a 30-minute session with a note-taker; do not record without explicit consent.

| Time | Activity | Questions / evidence |
| --- | --- | --- |
| 0–5 min | Context and consent | What work do you do? How variable is income? Who handles bookkeeping? |
| 5–13 min | Recent expense walkthrough | Describe the last business purchase. Where was it recorded? How was mixed personal/business use handled? |
| 13–20 min | Invoice-to-payment walkthrough | Show a redacted or fictional invoice process. When does a payment enter income records? What gets entered twice? |
| 20–26 min | Quarterly planning | How did you decide the last estimated payment? Where did the date and prior-year figures come from? |
| 26–30 min | Concept check | Which dashboard number would you verify first? Would a suggested category require confirmation? |

Code observations as capture delay, classification uncertainty, duplicate entry, estimate uncertainty, or collection delay. Separate observed behaviour from opinions. A later prototype study should time expense entry and invoice payment recording, and ask participants to explain an estimate breakdown. Five interviews explore workflow patterns; they cannot estimate population prevalence.

## 2. Five illustrative interview summaries

**Evidence status:** The following are representative fictional interviews created for requirements discovery. No interviews were conducted, and the quotes are invented. Counts below describe only these five scenarios.

| ID / representative participant | Current workflow | Illustrative finding | Design implication |
| --- | --- | --- | --- |
| I-01 / independent designer, monthly retainers | Spreadsheet expenses, receipt folder, document invoices | Enters a paid invoice in a second sheet and sometimes forgets the entry. “Payment should finish the record.” | Marking an invoice paid creates exactly one linked income entry. |
| I-02 / software contractor, irregular contracts | Bank export, spreadsheet, recurring software receipts | Cannot distinguish a software suggestion from a confirmed deduction. “Show me why that amount counts.” | Keep category, business-use percentage, and deductible amount visible; AI remains optional. |
| I-03 / delivery contractor, many small purchases | Phone notes and paper receipts | Records mixed-use purchases at full value and postpones cleanup. “I need to enter the business share while I remember it.” | Expense entry captures business use and category-specific deductibility. Mileage calculation is outside this MVP. |
| I-04 / independent consultant, larger invoices | Invoice template plus calendar reminders | Has prior-year tax totals but no single view of payments already made. “I do not know whether I am catching up or paying twice.” | Compare annualised liability and safe-harbour target; subtract logged payments visibly. |
| I-05 / part-time tutor, seasonal income | Cash notebook and occasional spreadsheet | Treats a quiet month as representative of the year and misses a deadline. “A date and a breakdown would help more than one big number.” | Label annualisation assumptions; display the next due date and payment history. |

### Operational friction findings

| Finding | Scenario evidence | Operational consequence | Requirement response |
| --- | --- | --- | --- |
| Separate invoice and income ledgers | I-01, I-04 | Missing or duplicated receipts distort profit | One atomic paid-invoice/income operation (FR-03, FR-05) |
| Deductibility is confused with purchase price | I-02, I-03 | Users overstate deductions | Store business share and show deduction formula (FR-02) |
| Records accumulate before classification | I-02, I-03 | Cleanup competes with billable work | Fast entry, filters, optional suggestion/fallback (FR-09, FR-10) |
| Payment history and forecasts are separate | I-04, I-05 | Payment amounts are hard to reconcile | Estimator breakdown and logged payments (FR-04, FR-06) |
| Cash timing obscures performance | I-01, I-05 | Outstanding invoices look like available income | Separate outstanding invoices from received income (FR-07) |

These are hypotheses for validation, not measured product benefits. A real study should check whether participants can explain deductible amounts and reconcile the dashboard with sample records.

## 3. User personas

### Persona A — Maya, independent designer

- **Role and context:** Sole proprietor serving several small clients from a home workspace; comfortable with web tools, limited bookkeeping knowledge. Fictional persona synthesised from I-01 and I-02.
- **Goals:** Send consistent invoices, see received income, capture subscriptions and supplies promptly, and understand which part of a purchase is deductible.
- **Pain points:** Re-entering payments, forgotten recurring expenses, unclear mixed-use treatment, and a spreadsheet that lags behind client work.
- **Tools today:** Spreadsheet, document invoice template, email, cloud receipt folder, and personal calendar.
- **Illustrative quote:** “When the client pays, I want my income and dashboard to agree.”
- **Detailed scenario:** Maya adds a client, drafts two design line items, checks the total, then marks the invoice sent. A week later she records payment. One linked income entry appears using the payment date. She adds a $100 mixed-use subscription with 80% business use and sees an $80 deduction. The dashboard separates the received amount from an unpaid invoice. She can print the invoice through the browser's Save as PDF workflow.
- **Success evidence:** Recording payment once changes income once; she can explain the displayed $80 without opening a separate sheet.

### Persona B — Daniel, independent consultant

- **Role and context:** Established consultant with uneven project receipts and prior-year tax records; uses desktop for planning and phone for capture. Fictional persona synthesised from I-04 and I-05.
- **Goals:** Plan quarterly cash reserves, compare a forecast with safe harbour, record payments already made, and identify overdue client balances.
- **Pain points:** Forecasts fluctuate after large receipts, payment history is fragmented, and a single tax total hides the self-employment component.
- **Tools today:** Spreadsheet forecast, calendar, invoice documents, and accountant-prepared prior-year summary.
- **Illustrative quote:** “Tell me the assumptions before I trust the payment amount.”
- **Detailed scenario:** Daniel selects the 2026 tax year and single filing status, enters prior-year total tax and AGI, then opens the estimator. It shows YTD profit, annualisation period, SE tax, deductions, federal income tax, previous payments, and the next scheduled date. He selects safe harbour, compares its target with the forecast, and records an estimated payment. The remaining balance updates while the calculation disclaimer stays visible.
- **Success evidence:** He can trace the target to the selected method and reconcile the remaining amount with his payment log.

## 4. Problem statement

Freelancers and independent contractors who manage expenses, invoices, income, and quarterly tax estimates in separate tools struggle to keep financial records consistent and timely. Duplicate payment entry, uncertain business-use deductions, and disconnected payment histories make it difficult to understand net earnings and plan estimated federal taxes. TaxWise Freelance will provide a single tenant-isolated workflow for recording business activity, issuing invoices, calculating transparent planning estimates, and monitoring payment deadlines, with explicit assumptions and an estimates-only disclaimer. The MVP does not file returns, move money, connect bank accounts, or replace professional tax advice.

## 5. Five core MVP features and acceptance criteria

| Feature | Acceptance criteria (Given / When / Then) | SRS mapping |
| --- | --- | --- |
| Expense tracking and deduction categorisation | Given a $100 expense at 80% business use in a fully deductible category, when saved, then its deductible amount is $80. Given the same expense in Meals, then it is $40. Date, vendor, amount, category, notes, payment method, and business use persist; invalid percentages are rejected. Only the owner can read or change it. | FR-02 |
| Income tracking | Given a valid manual receipt, when saved, then YTD income includes it once. Given an owned unpaid invoice, when marked paid, then exactly one income entry is created with its total and payment date; retries do not duplicate income. | FR-03, FR-05 |
| Quarterly tax estimator | Given valid 2026 settings and records, when calculated, then the result exposes YTD and annualised profit, SE tax, half-SE deduction, QBI, standard deduction, bracket tax, total liability, payment target, amounts paid, and next due date. Safe harbour uses 100% or 110% of prior-year tax at the specified AGI boundary. All computation uses integer cents and the UI displays the disclaimer. | FR-04, FR-06 |
| Invoicing | Given an owned client and valid line items, when an invoice is created, then its per-user number is unique and totals are calculated on the server. Draft, sent, paid, overdue, and void states follow controlled transitions; the printable view includes client, issuer, dates, items, and totals. | FR-05 |
| Dashboard | Given records across several months, when opened, then KPIs and charts reconcile with income, expense, deduction, payment, and invoice records for the selected year. Outstanding invoices exclude paid/void records; upcoming deadlines use the selected tax year. Empty, loading, and error states are usable on mobile. | FR-07 |

The category catalogue includes Advertising, Car & truck, Contract labor, Insurance, Legal & professional, Office expense, Rent/lease, Supplies, Travel, Meals, Utilities, Software & subscriptions, Home office, Education, and Other. Categories map to Schedule C reporting lines or an explicitly documented subcategory/worksheet treatment; the app does not claim that a category alone establishes legal deductibility. Meals uses a 50% factor in the project model. Detailed home-office, mileage, depreciation, and eligibility calculations are outside scope.
