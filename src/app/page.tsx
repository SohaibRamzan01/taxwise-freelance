import Link from "next/link";
import { ArrowRight, Check, ReceiptText, FileText, ChartNoAxesCombined, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

export default function LandingPage() {
  return <div className="container">
    <header className="landing-nav"><Brand /><nav aria-label="Main navigation" className="nav-actions"><a className="learn-link" href="#how-it-works">Built for your business</a><Link href="/login">Log in</Link><Link className="button" href="/signup">Get started <ArrowRight size={15} /></Link></nav></header>
    <main>
      <section className="hero">
        <div><span className="eyebrow"><span aria-hidden="true">●</span> For the independently ambitious</span><h1>Your work.<br />Your money.<br /><span>A clearer picture.</span></h1><p>Bring your freelance finances into focus. One place for business expenses, invoices, and a plan for tax season.</p><div className="hero-actions"><Link className="button" href="/signup">Create your account <ArrowRight size={17} /></Link><a className="button secondary" href="#how-it-works">Take a closer look</a></div><div className="hero-note"><Check size={15} /> Built around the way you work.</div></div>
        <div className="preview" aria-label="Illustrative financial overview with sample data"><div className="preview-card"><div className="preview-heading"><strong>Your business, at a glance</strong><span className="pill">Sample view</span></div><span className="muted" style={{ fontSize: 12 }}>Income this month</span><div className="preview-total">$8,450<span style={{ color: "#a6b8aa" }}>.00</span></div><div className="chart" aria-hidden="true">{[34, 57, 47, 72, 63, 92].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-labels" aria-hidden="true">{["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map(month => <span key={month}>{month}</span>)}</div><div className="preview-bottom"><span><Sparkles size={14} style={{ display: "inline", marginRight: 5 }} /> More clarity. More headspace.</span><span className="pill">All together</span></div></div></div>
      </section>
      <section className="features" id="how-it-works"><span className="eyebrow">Less admin. More possibility.</span><div className="section-heading"><h2>A little more order.<br />A lot more peace of mind.</h2><p>A workspace designed for the business you’re building, one project at a time.</p></div><div className="feature-grid">
        {[{ Icon: ReceiptText, title: "Every expense has a place", text: "Organize business costs and see which expenses may qualify for a deduction." }, { Icon: FileText, title: "From good work to paid work", text: "Keep clients and invoices together, with a clear view of what’s outstanding." }, { Icon: ChartNoAxesCombined, title: "Make a plan for tax time", text: "Estimate US federal quarterly taxes and keep upcoming payments in view." }].map(({ Icon, title, text }) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></article>)}
      </div></section>
    </main>
    <footer className="landing-footer"><span>© {new Date().getFullYear()} TaxWise Freelance. Work freely. Plan confidently.</span><span>Tax estimates are for planning purposes and are not tax advice.</span></footer>
  </div>;
}
