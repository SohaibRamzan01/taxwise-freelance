"use client";
import { useState } from "react";
import { dollarsToCents, moneyText } from "@/lib/money";
import { api, ErrorBox, Loading, PageTitle, useResource } from "./common";
import type { getSettings } from "@/lib/domain/summary";
type Profile = Awaited<ReturnType<typeof getSettings>>;
export function SettingsPage() {
  const resource = useResource<{ data: Profile }>("/api/settings");
  return <><PageTitle title="Make it your workspace" description="Set your tax assumptions and the business details shown on invoices." />{resource.loading && <Loading />}{resource.error && <ErrorBox message={resource.error} retry={resource.refresh} />}{resource.data && <SettingsForm profile={resource.data.data} />}</>;
}
function SettingsForm({ profile }: { profile: Profile }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setSaved(false);
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/settings", "PATCH", { filingStatus: data.get("filingStatus"), taxYear: 2026, priorYearTaxCents: dollarsToCents(String(data.get("priorYearTax"))), priorYearAgiCents: dollarsToCents(String(data.get("priorYearAgi"))), useSafeHarbour: data.get("useSafeHarbour") === "on", businessName: data.get("businessName") || null, businessAddress: data.get("businessAddress") || null, businessEmail: data.get("businessEmail") || null, businessPhone: data.get("businessPhone") || null, currency: "USD" }); setSaved(true);
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="settings-form"><section className="panel"><h2>Tax profile</h2><p className="muted">US federal · 2026</p><div className="form-grid"><label className="field">Filing status<select name="filingStatus" defaultValue={profile.filingStatus}><option value="SINGLE">Single</option><option value="MARRIED_FILING_JOINTLY">Married filing jointly</option><option value="HEAD_OF_HOUSEHOLD">Head of household</option></select></label><label className="field">Tax year<select name="taxYear"><option>2026</option></select></label><label className="field">Prior-year total tax (USD)<input name="priorYearTax" type="number" min="0" step="0.01" required defaultValue={moneyText(profile.priorYearTaxCents)} /></label><label className="field">Prior-year AGI (USD)<input name="priorYearAgi" type="number" min="0" step="0.01" required defaultValue={moneyText(profile.priorYearAgiCents)} /></label></div><label className="checkbox-label"><input type="checkbox" name="useSafeHarbour" defaultChecked={profile.useSafeHarbour} />Use the lower of regular and safe-harbour payment targets</label><p className="muted small">Safe harbour uses 100% of prior-year total tax, or 110% when prior AGI exceeds $150,000. Confirm that your prior-year return qualifies before enabling.</p></section><section className="panel"><h2>Business profile</h2><div className="form-grid">{[["businessName", "Business name", "text"], ["businessEmail", "Business email", "email"], ["businessPhone", "Business phone", "tel"]].map(([name, label, type]) => <label className="field" key={name}>{label}<input name={name} type={type} maxLength={200} defaultValue={String(profile[name as keyof Profile] ?? "")} /></label>)}<label className="field">Currency<select name="currency"><option>USD</option></select></label><label className="field full-width">Business address<textarea name="businessAddress" maxLength={2000} defaultValue={profile.businessAddress ?? ""} /></label></div></section>{error && <ErrorBox message={error} />}{saved && <p className="success-message" role="status">Your settings have been saved.</p>}<div className="form-actions"><button className="button" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button></div></form>;
}
