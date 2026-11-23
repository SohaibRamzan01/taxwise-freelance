import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  LockKeyhole,
  Menu,
  Plus,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeroSceneLoader } from "@/components/landing/hero-scene-loader";
import { HowItWorksStory } from "@/components/landing/how-it-works-story";
import { TaxPreview } from "@/components/landing/tax-preview";
import { FeaturesEditorial } from "@/components/landing/features-editorial";
import { ScrollReveal } from "@/components/landing/scroll-reveal";


const anchors = [
  ["how-it-works", "How it works"],
  ["estimate", "Tax preview"],
  ["features", "Features"],
  ["security", "Security"],
  ["questions", "Questions"],
];

const questions = [
  [
    "Is this tax advice?",
    "No. TaxWise provides estimates for planning, not tax advice. Review your records and eligibility with a qualified tax professional before filing or making payments.",
  ],
  [
    "Which tax rules does it use?",
    "US federal rules for tax year 2026, in USD. The estimator includes self-employment tax, federal income tax and a simplified QBI deduction. It does not cover state taxes, credits, W-2 wages, capital gains or withholding.",
  ],
  [
    "What can I upload?",
    "Receipt photos in JPG, PNG or WebP format, up to 5 MB each. You can also import and export expense records as CSV files.",
  ],
  [
    "Is my data private?",
    "Your records belong to your account. Every expense, client, invoice and receipt request checks the signed-in owner. TaxWise does not connect to your bank or ask for your bank login.",
  ],
  [
    "What does it cost?",
    "TaxWise is a free student project. Create an account to use the expense, invoicing and tax-planning tools.",
  ],
];

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Header Navigation */}
      <header className="landing-header">
        <div className="container landing-nav">
          <Brand />
          <nav className="landing-links" aria-label="Main navigation">
            {anchors.map(([id, label]) => (
              <a href={`#${id}`} key={id}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <Link className="login-link" href="/login">
              Log in
            </Link>
            <Link className="button button-sm" href="/signup">
              Get started <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <details className="landing-menu">
              <summary aria-label="Open navigation">
                <Menu size={19} aria-hidden="true" />
              </summary>
              <nav aria-label="Mobile navigation">
                {anchors.map(([id, label]) => (
                  <a href={`#${id}`} key={id}>
                    {label}
                  </a>
                ))}
                <Link href="/login">Log in</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero Section */}
        <section className="container hero">
          <div className="hero-copy">
            <h1 className="hero-title">
              Small receipts.
              <br />
              A clearer picture of your{" "}
              <span className="mark highlight-sweep">deductions.</span>
            </h1>
            <p className="hero-sub">
              Turn everyday business costs into organized records. Scan a
              receipt, review its category, and see how it fits into your
              quarterly tax plan.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/signup">
                Start keeping track <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className="button secondary" href="#how-it-works">
                See how it works
              </a>
            </div>

            {/* Proof Points Row */}
            <div className="hero-proof-row" aria-label="Platform capabilities">
              <span className="proof-point">
                <ScanLine size={16} aria-hidden="true" />
                <span>Tesseract OCR receipts</span>
              </span>
              <span className="proof-point">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>2026 federal tax rules</span>
              </span>
              <span className="proof-point">
                <FileText size={16} aria-hidden="true" />
                <span>PDF tax summaries</span>
              </span>
            </div>

            <p className="hero-note">
              <Check size={15} aria-hidden="true" /> Free student project · No bank connection
            </p>
          </div>

          {/* Interactive 3D Hero Scene with Fallback */}
          <div className="hero-scene-wrap">
            <HeroSceneLoader />
          </div>
        </section>

        {/* How It Works Section */}
        <section
          className="landing-section"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-heading">
                <h2 id="how-title">
                  Less loose paper.
                  <br />
                  More of the full picture.
                </h2>
                <p>
                  Three steps from a business purchase to a plan you can review.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <HowItWorksStory />
            </ScrollReveal>
          </div>
        </section>

        {/* Live Tax Preview Section */}
        <section
          className="landing-section preview-section"
          id="estimate"
          aria-labelledby="estimate-title"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-heading">
                <h2 id="estimate-title">
                  See the math
                  <br />
                  before you start.
                </h2>
                <p>
                  Slide your estimated income and expenses to preview your 2026
                  federal tax picture.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal>
              <TaxPreview />
            </ScrollReveal>
          </div>
        </section>

        {/* Features Section */}
        <section
          className="landing-section feature-section"
          id="features"
          aria-labelledby="features-title"
        >
          <div className="container">
            <ScrollReveal>
              <h2 id="features-title" className="landing-heading">
                The business side,
                <br />
                all in one workspace.
              </h2>
            </ScrollReveal>
            <ScrollReveal>
              <FeaturesEditorial />
            </ScrollReveal>
          </div>
        </section>

        {/* Security Section */}
        <section
          className="container landing-section"
          id="security"
          aria-labelledby="security-title"
        >
          <ScrollReveal>
            <div className="security-grid">
              <div className="security-poster">
                <LockKeyhole size={36} aria-hidden="true" />
                <div>
                  <h2 id="security-title">
                    Your records.
                    <br />
                    Your workspace.
                  </h2>
                  <p>
                    No bank login or bank connection. Add the records you choose
                    and keep the business details in one place.
                  </p>
                </div>
              </div>
              <div className="security-notes">
                <article>
                  <ShieldCheck size={25} aria-hidden="true" />
                  <h3>Passwords stay protected</h3>
                  <p>
                    Passwords are hashed with bcrypt. Your session uses an
                    httpOnly cookie that browser scripts cannot read.
                  </p>
                </article>
                <article>
                  <LockKeyhole size={25} aria-hidden="true" />
                  <h3>Privacy in every request</h3>
                  <p>
                    Records are scoped to the signed-in owner. HTTPS protects
                    data in transit on the deployed app.
                  </p>
                </article>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Questions / FAQ Section */}
        <section
          className="container landing-section"
          id="questions"
          aria-labelledby="questions-title"
        >
          <ScrollReveal>
            <h2 id="questions-title" className="landing-heading">
              Before you get started.
            </h2>
            <div className="faq">
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <Plus size={21} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Closing CTA Band */}
        <section className="closing-band">
          <div className="container closing-inner">
            <div className="closing-copy">
              <h2>
                Make room for
                <br />
                your next good idea.
              </h2>
              <p>Keep your records in order, one receipt at a time.</p>
            </div>
            <div className="closing-action">
              <Link className="button" href="/signup">
                Create your free account{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            {/* Decorative CSS Receipt Slips */}
            <div className="closing-receipts-decor" aria-hidden="true">
              <div className="closing-receipt-slip slip-1">
                <span>Desk &amp; Circuit</span>
                <span className="mono font-semibold">$240.00</span>
              </div>
              <div className="closing-receipt-slip slip-2">
                <span>FiberNet</span>
                <span className="mono font-semibold">$79.99</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container landing-footer">
        <Brand />
        <span>
          © {new Date().getFullYear()} TaxWise Freelance · Student project
        </span>
        <span>Estimates for planning, not tax advice.</span>
        <Link href="/dashboard">
          Open workspace <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </footer>
    </>
  );
}
