import Link from "next/link";
import { ArrowRight, Check, FileText, LockKeyhole, Menu, Plus, ReceiptText, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const anchors = [["how-it-works", "How it works"], ["features", "Features"], ["security", "Security"], ["questions", "Questions"]];
const questions = [
  ["Is this tax advice?", "No. TaxWise provides estimates for planning, not tax advice. Review your records and eligibility with a qualified tax professional before filing or making payments."],
  ["Which tax rules does it use?", "US federal rules for tax year 2026, in USD. The estimator includes self-employment tax, federal income tax and a simplified QBI deduction. It does not cover state taxes, credits, W-2 wages, capital gains or withholding."],
  ["What can I upload?", "Receipt photos in JPG, PNG or WebP format, up to 5 MB each. You can also import and export expense records as CSV files."],
  ["Is my data private?", "Your records belong to your account. Every expense, client, invoice and receipt request checks the signed-in owner. TaxWise does not connect to your bank or ask for your bank login."],
  ["What does it cost?", "TaxWise is a free student project. Create an account to use the expense, invoicing and tax-planning tools."],
];

function ReceiptPreview() {
  return <figure className="receipt-stage" aria-label="Sample receipt and tax summary, using fictional data">
    <div className="paper summary-sheet"><div className="sample-label">Sample tax summary</div><h3>A little more accounted for.</h3><dl><div><dt>Business expense</dt><dd>$240.00</dd></div><div><dt>Business use</dt><dd>100%</dd></div><div className="summary-total"><dt>Deductible amount</dt><dd>$240.00</dd></div></dl><p>Review eligibility before saving.</p></div>
    <div className="paper receipt-sheet"><div className="receipt-masthead"><ReceiptText size={24} aria-hidden="true" /><span className="sample-label">Sample receipt</span></div><h2>Desk &amp; Circuit</h2><p className="receipt-sub">Fictional office supply shop</p><div className="receipt-meta mono"><span>2026-06-08</span><span>TW-024</span></div><dl><div><dt>External monitor</dt><dd>$210.00</dd></div><div><dt>USB-C adapter</dt><dd>$30.00</dd></div><div className="receipt-total"><dt>Total</dt><dd>$240.00</dd></div></dl><div className="receipt-category"><Check size={16} aria-hidden="true" /><span>Computer hardware · 100% deductible</span></div><p className="receipt-review">At 100% business use · subject to eligibility</p><div className="receipt-bars" aria-hidden="true" /></div>
    <figcaption>Sample data · You review every suggestion.</figcaption>
  </figure>;
}

export default function LandingPage() {
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="landing-header"><div className="container landing-nav"><Brand /><nav className="landing-links" aria-label="Main navigation">{anchors.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav><div className="nav-actions"><Link className="login-link" href="/login">Log in</Link><Link className="button button-sm" href="/signup">Get started <ArrowRight size={15} aria-hidden="true" /></Link><ThemeToggle /><details className="landing-menu"><summary aria-label="Open navigation"><Menu size={19} aria-hidden="true" /></summary><nav aria-label="Mobile navigation">{anchors.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}<Link href="/login">Log in</Link></nav></details></div></div></header>
    <main id="main-content">
      <section className="container hero"><div className="hero-copy"><span className="eyebrow">Freelance finances, in focus</span><h1>Small receipts.<br />A clearer picture of your <span className="mark">deductions.</span></h1><p className="hero-sub">Turn everyday business costs into organized records. Scan a receipt, review its category, and see how it fits into your quarterly tax plan.</p><div className="hero-actions"><Link className="button" href="/signup">Start keeping track <ArrowRight size={17} aria-hidden="true" /></Link><a className="button secondary" href="#how-it-works">See how it works</a></div><p className="hero-note"><Check size={15} aria-hidden="true" /> Free student project. No bank connection.</p></div><ReceiptPreview /></section>
      <section className="landing-section" id="how-it-works" aria-labelledby="how-title"><div className="container"><span className="eyebrow">01 / From receipt to record</span><div className="section-heading"><h2 id="how-title">Less loose paper.<br />More of the full picture.</h2><p>Three steps from a business purchase to a plan you can review.</p></div><ol className="steps-grid">{[
        { Icon: ScanLine, title: "Scan the receipt", text: "Upload a photo. Tesseract OCR reads the text and helps fill in the vendor, date and total. Check the details before you save." },
        { Icon: Sparkles, title: "Give it a category", text: "Rules suggest a deduction category, with Gemini assistance when available. Set business use and review the suggestion. You stay in control." },
        { Icon: FileText, title: "See where you stand", text: "Use your recorded income and deductions to estimate quarterly federal taxes. Download a tax-ready summary PDF when you need it." },
      ].map(({ Icon, title, text }, i) => <li key={title}><div className="step-top"><span className="step-number mono">0{i + 1}</span><Icon size={25} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></li>)}</ol></div></section>
      <section className="landing-section feature-section" id="features" aria-labelledby="features-title"><div className="container"><span className="eyebrow">02 / Your working toolkit</span><h2 id="features-title" className="landing-heading">The business side,<br />all in one workspace.</h2><div className="feature-rows">{[
        ["Expenses & deductions", "Track purchases, business-use percentages and deductible amounts across 17 categories, from hardware and internet to travel.", "cost"],
        ["Invoices that follow the work", "Keep clients and line items together. Mark an invoice paid and its income is recorded automatically. Download the invoice as a PDF.", "revenue"],
        ["A quarterly tax plan", "Review an annualised federal estimate, compare safe-harbour payment targets and record the estimated payments you make.", "operating"],
        ["A dashboard with the details", "Follow income, expenses, deductions and upcoming deadlines. Export tax-ready PDF summaries by year or quarter.", "excluded"],
        ["Records that travel with you", "Import expenses from CSV, review them before saving, and export filtered records when you need to work elsewhere.", "cost"],
      ].map(([title, text, color]) => <article className="feature-row" key={title}><h3 className={`feature-stroke accent-${color}`}>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="container landing-section" id="security" aria-labelledby="security-title"><div className="security-grid"><div className="security-poster"><LockKeyhole size={36} aria-hidden="true" /><div><span className="eyebrow">03 / Built with care</span><h2 id="security-title">Your records.<br />Your workspace.</h2><p>No bank login or bank connection. Add the records you choose and keep the business details in one place.</p></div></div><div className="security-notes"><article><ShieldCheck size={25} aria-hidden="true" /><h3>Passwords stay protected</h3><p>Passwords are hashed with bcrypt. Your session uses an httpOnly cookie that browser scripts cannot read.</p></article><article><LockKeyhole size={25} aria-hidden="true" /><h3>Privacy in every request</h3><p>Records are scoped to the signed-in owner. HTTPS protects data in transit on the deployed app.</p></article></div></div></section>
      <section className="container landing-section" id="questions" aria-labelledby="questions-title"><span className="eyebrow">04 / A few useful answers</span><h2 id="questions-title" className="landing-heading">Before you get started.</h2><div className="faq">{questions.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={21} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
      <section className="closing-band"><div className="container closing-inner"><div><h2>Make room for<br />your next good idea.</h2><p>Keep your records in order, one receipt at a time.</p></div><Link className="button" href="/signup">Create your free account <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    </main>
    <footer className="container landing-footer"><Brand /><span>© {new Date().getFullYear()} TaxWise Freelance · Student project</span><span>Estimates for planning, not tax advice.</span><Link href="/dashboard">Open workspace <ArrowRight size={14} aria-hidden="true" /></Link></footer>
  </>;
}
