"use client";
import { useState } from "react";
import type { ImportRow } from "@/lib/data/csv";
import { categories } from "@/lib/tax/categories";
import { formatMoney } from "@/lib/money";
import { api, ErrorBox } from "./common";
import { notify } from "@/components/notifications";
export function ExpenseImport({ done }: { done: () => void }) {
  const [csv, setCsv] = useState(""); const [rows, setRows] = useState<ImportRow[]>(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  function change(value: string) { setCsv(value); setRows(undefined); setError(""); }
  async function preview() {
    setPending(true); setError(""); setRows(undefined);
    try { setRows((await api<{ data: ImportRow[] }>("/api/expenses/import/preview", "POST", { csv })).data); }
    catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  async function commit() {
    setPending(true); setError("");
    try { await api("/api/expenses/import", "POST", { rows: rows!.map(r => r.data) }); done(); }
    catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  return <><p className="muted small">Up to 50 rows, 128 KB. Required headers: date, vendor, amount (USD). Optional: category, businessUsePercent, paymentMethod, notes. Leave category blank for a suggestion. Dates use YYYY-MM-DD; categories and payment methods use their codes.</p><p className="small">Example: <code>date,vendor,amount</code><br /><code>2026-06-01,Adobe,29.99</code></p><label className="field">CSV file<input type="file" accept=".csv,text/csv" disabled={pending} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 128000) { setError("Choose a CSV up to 128 KB."); notify("Choose a CSV up to 128 KB.", "error"); return; } try { change(await file.text()); } catch { setError("Could not read this file."); } }} /></label><label className="field editor-section">Or paste CSV<textarea rows={6} value={csv} disabled={pending} onChange={e => change(e.target.value)} /></label><button className="button secondary editor-section" disabled={pending || !csv} onClick={preview}>{pending ? "Working…" : "Preview and validate"}</button>{error && <ErrorBox message={error} />}{rows && <><p className="small">Review suggestions before importing. Correct rows with errors in the CSV and preview again. Importing the same file again creates new entries.</p><div className="table-wrap"><table><thead><tr><th>Line</th><th>Expense</th><th>Amount</th><th>Category / validation</th></tr></thead><tbody>{rows.map((r, index) => <tr key={r.line}><td>{r.line}</td><td>{String(r.data.date)}<br />{String(r.data.vendor)}</td><td>{formatMoney(Number(r.data.amountCents))}</td><td>{r.errors.length ? <span className="danger">{r.errors.join(" ")}</span> : <><select aria-label={`Category for CSV line ${r.line}`} value={String(r.data.category)} disabled={pending} onChange={e => setRows(current => current!.map((item, i) => i === index ? { ...item, data: { ...item.data, category: e.target.value } } : item))}>{Object.entries(categories).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}</select>{r.suggestion && <small>{r.suggestion.source === "ai" ? "AI" : "Rules"} suggestion · {Math.round(r.suggestion.confidence * 100)}% confidence</small>}</>}</td></tr>)}</tbody></table></div><div className="form-actions"><button className="button" disabled={pending || rows.some(r => r.errors.length > 0)} onClick={commit}>Import {rows.length} expenses</button></div></>}</>;
}
