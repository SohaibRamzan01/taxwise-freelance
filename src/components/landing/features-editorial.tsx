import { Check, ReceiptText } from "lucide-react";

export function FeaturesEditorial() {
  return (
    <div className="editorial-features">
      {/* Featured Lead Card */}
      <div className="editorial-lead">
        <div className="editorial-lead-content">
          <h3 className="feature-stroke accent-cost">Expenses &amp; deductions</h3>
          <p className="editorial-lead-text">
            Track purchases, business-use percentages and deductible amounts across 17 categories, from hardware and internet to travel.
          </p>
        </div>

        {/* Inline HTML/CSS Product-Like Illustration */}
        <div className="editorial-lead-illustration" aria-label="Visual sample of expense record details and tax deduction calculation">
          <div className="editorial-expense-card paper">
            <div className="editorial-expense-top">
              <div className="editorial-vendor-info">
                <ReceiptText size={20} className="editorial-icon" aria-hidden="true" />
                <div>
                  <span className="editorial-vendor-name">Desk &amp; Circuit</span>
                  <span className="editorial-expense-date mono">2026-06-08 · TW-024</span>
                </div>
              </div>
              <span className="editorial-total-badge mono">$240.00</span>
            </div>

            <div className="editorial-category-row">
              <span className="category-chip" style={{ background: "#9FD6FF" }}>
                Computer hardware &amp; equipment
              </span>
              <span className="editorial-irs-line">Schedule C · Line 18</span>
            </div>

            <dl className="editorial-calc-breakdown">
              <div>
                <dt>Business use</dt>
                <dd className="mono font-semibold">100%</dd>
              </div>
              <div>
                <dt>IRS deductibility</dt>
                <dd className="mono font-semibold">100%</dd>
              </div>
              <div className="editorial-calc-total">
                <dt>Allowable deduction</dt>
                <dd className="mono font-bold">$240.00</dd>
              </div>
            </dl>

            <div className="editorial-audit-footer">
              <Check size={14} aria-hidden="true" />
              <span>Receipt image verified · pre-filled via Tesseract OCR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Typographic List for Remaining 4 Features */}
      <div className="editorial-list">
        <article className="editorial-item">
          <h3 className="feature-stroke accent-revenue">Invoices that follow the work</h3>
          <p>
            Keep clients and line items together. Mark an invoice paid and its income is recorded automatically. Download the invoice as a PDF.
          </p>
        </article>

        <article className="editorial-item">
          <h3 className="feature-stroke accent-operating">A quarterly tax plan</h3>
          <p>
            Review an annualised federal estimate, compare safe-harbour payment targets and record the estimated payments you make.
          </p>
        </article>

        <article className="editorial-item">
          <h3 className="feature-stroke accent-excluded">A dashboard with the details</h3>
          <p>
            Follow income, expenses, deductions and upcoming deadlines. Export tax-ready PDF summaries by year or quarter.
          </p>
        </article>

        <article className="editorial-item">
          <h3 className="feature-stroke accent-cost">Records that travel with you</h3>
          <p>
            Import expenses from CSV, review them before saving, and export filtered records when you need to work elsewhere.
          </p>
        </article>
      </div>
    </div>
  );
}
