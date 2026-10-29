import { ThemeToggle } from "./theme-toggle";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";
import { Check } from "lucide-react";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return <main className="auth-layout"><aside className="auth-story"><div className="auth-brand-row"><Brand /><ThemeToggle /></div><section><span className="eyebrow">Independent, together.</span><h2>You do the work.<br />Let’s make the numbers clearer.</h2><p>A calmer place for the business side of being your own boss.</p><p style={{ marginTop: 35, display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}><Check size={17} /> Expenses. Invoices. Tax planning.</p></section><footer>Made for freelancers, contractors, and independent minds.</footer></aside><div className="auth-main"><AuthForm mode={mode} /></div></main>;
}
