import { Check, ReceiptText } from "lucide-react";

export function HeroFallback() {
  return (
    <figure className="receipt-stage" aria-label="Sample receipt and tax summary, using fictional data">
      <div className="paper summary-sheet">
        <div className="sample-label">Sample tax summary</div>
        <h3>A little more accounted for.</h3>
        <dl>
          <div><dt>Business expense</dt><dd>$240.00</dd></div>
          <div><dt>Business use</dt><dd>100%</dd></div>
          <div className="summary-total"><dt>Deductible amount</dt><dd>$240.00</dd></div>
        </dl>
        <p>Review eligibility before saving.</p>
      </div>
      <div className="paper receipt-sheet">
        <div className="receipt-masthead">
          <ReceiptText size={24} aria-hidden="true" />
          <span className="sample-label">Sample receipt</span>
        </div>
        <h2>Desk &amp; Circuit</h2>
        <p className="receipt-sub">Fictional office supply shop</p>
        <div className="receipt-meta mono">
          <span>2026-06-08</span><span>TW-024</span>
        </div>
        <dl>
          <div><dt>External monitor</dt><dd>$210.00</dd></div>
          <div><dt>USB-C adapter</dt><dd>$30.00</dd></div>
          <div className="receipt-total"><dt>Total</dt><dd>$240.00</dd></div>
        </dl>
        <div className="receipt-category">
          <Check size={16} aria-hidden="true" />
          <span>Computer hardware · 100% deductible</span>
        </div>
        <p className="receipt-review">At 100% business use · subject to eligibility</p>
        <div className="receipt-bars" aria-hidden="true" />
      </div>
      <figcaption>Sample data · You review every suggestion.</figcaption>
    </figure>
  );
}
