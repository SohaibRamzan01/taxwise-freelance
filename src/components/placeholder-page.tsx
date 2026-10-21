import { ReceiptText, ArrowDownLeft, FileText, Users, Calculator, Settings, ShieldCheck, Info } from "lucide-react";

const content = {
  expenses: { title: "Expenses", headline: "Give every expense a home.", text: "Keep business costs organized, categorize purchases, and see your potential deductions in one place.", Icon: ReceiptText },
  income: { title: "Income", headline: "See what your hard work brings in.", text: "Track freelance earnings and income from paid invoices for a clearer view of your business.", Icon: ArrowDownLeft },
  invoices: { title: "Invoices", headline: "The next step after great work.", text: "Create professional invoices, track their status, and stay on top of outstanding payments.", Icon: FileText },
  clients: { title: "Clients", headline: "Good relationships, all together.", text: "Keep your client contacts and billing details close, ready for your next project.", Icon: Users },
  tax: { title: "Tax Estimator", headline: "A clearer plan for tax season.", text: "Explore US federal estimated taxes, track quarterly payments, and prepare for upcoming deadlines.", Icon: Calculator },
  settings: { title: "Settings", headline: "Make this space yours.", text: "Your business profile, filing status, and tax preferences will live here.", Icon: Settings },
  admin: { title: "Admin", headline: "A thoughtful view of the platform.", text: "User management, platform activity, and audit history will be available here.", Icon: ShieldCheck },
};

export function PlaceholderPage({ section }: { section: keyof typeof content }) {
  const { title, headline, text, Icon } = content[section];
  return <><header className="page-title"><span className="eyebrow">Your workspace</span><h1>{title}</h1><p>A little more clarity for your business.</p></header><section className="empty-panel"><span className="empty-icon"><Icon size={28} /></span><h2>{headline}</h2><p>{text}</p><span className="pill">Coming soon</span></section>{section === "tax" && <p className="disclaimer"><Info size={14} />Estimates are for planning purposes and are not tax advice.</p>}</>;
}
