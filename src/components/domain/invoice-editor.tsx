"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { dollarsToCents, formatMoney, moneyText } from "@/lib/money";
import { invoiceTotals } from "@/lib/domain/invoices";
import { api, ErrorBox, useResource } from "./common";
import type { RecordRow } from "./records";

export function InvoiceEditor({ row, done, close }: { row?: RecordRow; done: () => void; close: () => void }) {
  const [clientSearch, setClientSearch] = useState("");
  const clients = useResource<{ data: RecordRow[] }>(`/api/clients?pageSize=100&sort=name&direction=asc&search=${encodeURIComponent(clientSearch)}`);
  const [clientId, setClientId] = useState(row?.clientId ?? "");
  const [items, setItems] = useState((row?.items ?? [{ description: "", quantity: 1, unitPriceCents: 0 }]).map((item, id) => ({ id, description: item.description, quantity: String(item.quantity), price: moneyText(item.unitPriceCents) })));
  const [nextId, setNextId] = useState(items.length);
  const [discount, setDiscount] = useState(moneyText(row?.discountCents ?? 0));
  const [tax, setTax] = useState(((row?.taxRateBasisPoints ?? 0) / 100).toFixed(2));
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const bodyItems = () => items.map(item => ({ description: item.description, quantity: Number(item.quantity), unitPriceCents: dollarsToCents(item.price) }));
  let preview: ReturnType<typeof invoiceTotals> | null = null;
  try { preview = invoiceTotals({ items: bodyItems(), discountCents: dollarsToCents(discount), taxRateBasisPoints: dollarsToCents(tax) }); } catch { /* Invalid drafts show no total until corrected. */ }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/invoices${row ? `/${row.id}` : ""}`, row ? "PATCH" : "POST", {
        clientId, issueDate: form.get("issueDate"), dueDate: form.get("dueDate"), items: bodyItems(), discountCents: dollarsToCents(discount), taxRateBasisPoints: dollarsToCents(tax), currency: "USD", notes: form.get("notes") || null, terms: form.get("terms") || null,
      }); done();
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  const changeItem = (id: number, key: "description" | "quantity" | "price", value: string) => setItems(items.map(item => item.id === id ? { ...item, [key]: value } : item));
  return <form onSubmit={submit}><div className="form-grid"><label className="field">Find client<input type="search" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search by name or company" /></label><label className="field">Client<select required value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Choose a client</option>{clientId && !clients.data?.data.some(c => c.id === clientId) && <option value={clientId}>{row?.client?.name || "Selected client"}</option>}{clients.data?.data.map(client => <option key={client.id} value={client.id}>{client.company || client.name}</option>)}</select></label><label className="field">Issue date<input name="issueDate" type="date" required defaultValue={row?.issueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} /></label><label className="field">Due date<input name="dueDate" type="date" required defaultValue={row?.dueDate?.slice(0, 10)} /></label></div>
    {clients.loading && <p role="status">Loading clients…</p>}{clients.error && <ErrorBox message={clients.error} retry={clients.refresh} />}{clients.data?.data.length === 0 && <p className="muted">No matching clients. <Link href="/clients" className="text-link">Add a client first</Link>.</p>}
    <h3 className="editor-section">Line items</h3><div className="invoice-items">{items.map((item, i) => <div className="invoice-item" key={item.id}><label className="field">Description {i + 1}<input required maxLength={200} value={item.description} onChange={e => changeItem(item.id, "description", e.target.value)} /></label><label className="field">Quantity<input type="number" min="0.0001" max="1000000" step="0.0001" required value={item.quantity} onChange={e => changeItem(item.id, "quantity", e.target.value)} /></label><label className="field">Unit price (USD)<input type="number" min="0" step="0.01" required value={item.price} onChange={e => changeItem(item.id, "price", e.target.value)} /></label><button type="button" className="icon-button danger" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter(x => x.id !== item.id))}><Trash2 size={17} /></button></div>)}</div><button type="button" className="text-button" disabled={items.length >= 50} onClick={() => { setItems([...items, { id: nextId, description: "", quantity: "1", price: "0.00" }]); setNextId(n => n + 1); }}><Plus size={15} /> Add line</button>
    <div className="form-grid editor-section"><label className="field">Discount (USD)<input type="number" min="0" step="0.01" required value={discount} onChange={e => setDiscount(e.target.value)} /></label><label className="field">Tax rate (%)<input type="number" min="0" max="100" step="0.01" required value={tax} onChange={e => setTax(e.target.value)} /></label><label className="field">Notes<textarea name="notes" maxLength={2000} defaultValue={row?.notes ?? ""} /></label><label className="field">Payment terms<textarea name="terms" maxLength={2000} defaultValue={row?.terms ?? ""} /></label></div>
    <div className="invoice-preview"><span>Subtotal {preview ? formatMoney(preview.subtotalCents) : "—"} · Tax {preview ? formatMoney(preview.taxCents) : "—"}</span><strong>Total {preview ? formatMoney(preview.totalCents) : "—"}</strong></div><p className="muted small">{row ? "Editing preserves the current status." : "New invoices are saved as drafts."} “Send” records sent status; email delivery is not included.</p>{error && <ErrorBox message={error} />}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button" disabled={pending}>{pending ? "Saving…" : "Save invoice"}</button></div>
  </form>;
}
