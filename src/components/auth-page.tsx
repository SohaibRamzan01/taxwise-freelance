import { ThemeToggle } from "./theme-toggle";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";
import { Check } from "lucide-react";
import { categoryColors } from "@/lib/category-colors";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <div className="auth-brand-row">
          <Brand />
          <ThemeToggle />
        </div>
        <section>
          <h2>You do the work.<br />Let’s make the numbers clearer.</h2>
          <p>A calmer place for the business side of being your own boss.</p>
          <div className="auth-receipts-decor" aria-hidden="true">
            <div className="auth-receipt-slip">
              <div className="auth-receipt-meta">
                <span className="auth-receipt-vendor">Dell Technologies</span>
                <span className="auth-receipt-date">Hardware & equipment</span>
              </div>
              <div className="auth-receipt-right">
                <span className="auth-receipt-amount">$349.00</span>
                <span className="auth-receipt-chip" style={{ background: categoryColors.COMPUTER_HARDWARE }}>Hardware</span>
              </div>
            </div>
            <div className="auth-receipt-slip">
              <div className="auth-receipt-meta">
                <span className="auth-receipt-vendor">Figma Design Tool</span>
                <span className="auth-receipt-date">Software & subscriptions</span>
              </div>
              <div className="auth-receipt-right">
                <span className="auth-receipt-amount">$15.00</span>
                <span className="auth-receipt-chip" style={{ background: categoryColors.SOFTWARE_AND_SUBSCRIPTIONS }}>Software</span>
              </div>
            </div>
            <div className="auth-receipt-slip">
              <div className="auth-receipt-meta">
                <span className="auth-receipt-vendor">Client Dinner</span>
                <span className="auth-receipt-date">Meals · 50% deductible</span>
              </div>
              <div className="auth-receipt-right">
                <span className="auth-receipt-amount">$64.20</span>
                <span className="auth-receipt-chip" style={{ background: categoryColors.MEALS }}>Meals</span>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 26, display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
            <Check size={17} /> Expenses. Invoices. Tax planning.
          </p>
        </section>
        <footer>Made for freelancers, contractors, and independent minds.</footer>
      </aside>
      <div className="auth-main">
        <AuthForm mode={mode} />
      </div>
    </main>
  );
}
