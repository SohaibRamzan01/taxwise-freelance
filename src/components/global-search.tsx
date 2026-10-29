"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { api, Empty, ErrorBox, Modal } from "./domain/common";
import { formatMoney } from "@/lib/money";
type Results = { expenses: { id: string; vendor: string; amountCents: number }[]; clients: { id: string; name: string }[]; invoices: { id: string; number: string; totalCents: number }[] };
export function GlobalSearch() {
  const [text, setText] = useState(""); const [results, setResults] = useState<Results>(); const [open, setOpen] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setOpen(true); setPending(true); setResults(undefined); setError("");
    try { setResults((await api<{ data: Results }>(`/api/search?q=${encodeURIComponent(text)}`)).data); }
    catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  return <><form className="global-search" role="search" onSubmit={submit}><input aria-label="Search expenses, clients and invoices" placeholder="Search your workspace" value={text} minLength={2} maxLength={200} required onChange={e => setText(e.target.value)} /><button className="text-button" aria-label="Search" disabled={pending}><Search className="search-button-icon" size={18} aria-hidden="true" /><span className="search-button-label">Search</span></button></form>{open && <Modal title="Search results" close={() => setOpen(false)}>{pending && <p role="status">Searching…</p>}{error && <ErrorBox message={error} />}{results && <><p className="muted small">Up to five matches per section.</p>{!Object.values(results).some(rows => rows.length) && <Empty title="No matches" message="Try a vendor, client name or invoice number." />}<div className="compact-list" onClick={() => setOpen(false)}>{results.expenses.map(r => <Link key={r.id} href={`/expenses?search=${encodeURIComponent(r.vendor)}`}><span>Expense · {r.vendor}</span><span className="money out">{formatMoney(r.amountCents)}</span></Link>)}{results.clients.map(r => <Link key={r.id} href={`/clients?search=${encodeURIComponent(r.name)}`}>Client · {r.name}</Link>)}{results.invoices.map(r => <Link key={r.id} href={`/invoices/${r.id}/print`}><span>Invoice · {r.number}</span><span className="money">{formatMoney(r.totalCents)}</span></Link>)}</div></>}</Modal>}</>;
}
