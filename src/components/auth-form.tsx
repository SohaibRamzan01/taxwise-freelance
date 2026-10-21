"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
      const result = await response.json();
      if (!response.ok) {
        const fields = result.error?.details?.fieldErrors as Record<string, string[]> | undefined;
        const detail = fields ? Object.values(fields).flat()[0] : undefined;
        setError(detail ?? result.error?.message ?? "Unable to sign in. Please try again.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      const paths = ["/dashboard", "/expenses", "/income", "/invoices", "/clients", "/tax-estimator", "/settings", "/admin"];
      router.replace(next && paths.includes(next) ? next : "/dashboard");
      router.refresh();
    } catch { setError("We couldn’t connect. Check your connection and try again."); }
    finally { setPending(false); }
  }

  return <form className="auth-form" onSubmit={submit} aria-busy={pending}>
    <span className="eyebrow">Your business starts with you</span><h1>{signup ? "Make yourself at home." : "Welcome back."}</h1><p className="muted">{signup ? "Create your account and bring your finances together." : "A little clarity for your next big move."}</p>
    {signup && <><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required minLength={2} maxLength={100} /></>}
    <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@yourbusiness.com" required maxLength={254} />
    <label htmlFor="password">Password</label><div className="password-input"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={72} aria-describedby={signup ? "password-hint" : undefined} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
    {signup && <p className="hint" id="password-hint">At least 12 characters; at most 72 UTF-8 bytes.</p>}
    {error && <div className="error-message" role="alert">{error}</div>}
    <button className="button" disabled={pending} type="submit">{pending ? "One moment…" : signup ? "Create account" : "Log in"}<ArrowRight size={17} /></button>
    <p className="auth-switch">{signup ? "Already have an account?" : "New to TaxWise?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
  </form>;
}
