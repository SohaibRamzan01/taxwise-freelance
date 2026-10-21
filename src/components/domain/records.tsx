"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { categories } from "@/lib/tax/categories";
import { dollarsToCents, formatMoney, moneyText } from "@/lib/money";
import type { Entity } from "@/lib/domain/validation";
import { api, Empty, ErrorBox, Loading, Modal, PageTitle, Status, useResource } from "./common";
import { InvoiceEditor } from "./invoice-editor";

export interface ItemRow { description: string; quantity: string | number; unitPriceCents: number; amountCents?: number }
export interface RecordRow {
  id: string; date?: string; vendor?: string; source?: string; name?: string; company?: string | null; email?: string | null; phone?: string | null; address?: string | null;
  amountCents?: number; category?: keyof typeof categories; businessUsePercent?: number; paymentMethod?: string; notes?: string | null; invoiceId?: string | null;
  number?: string; clientId?: string; client?: { name: string; company?: string | null }; status?: string; issueDate?: string; dueDate?: string; paidAt?: string | null;
  totalCents?: number; discountCents?: number; taxRateBasisPoints?: number; currency?: string; items?: ItemRow[]; terms?: string | null;
  taxYear?: number; quarter?: number; confirmation?: string | null;
}
type Field = { key: keyof RecordRow; label: string; type?: string; options?: [string, string][]; optional?: boolean; min?: number; max?: number; step?: string; cents?: boolean };
const methodOptions: [string, string][] = ["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"].map(value => [value, value.replaceAll("_", " ")]);
const dateField: Field = { key: "date", label: "Date", type: "date" };
const amountField: Field = { key: "amountCents", label: "Amount (USD)", type: "number", min: 0, step: "0.01", cents: true };
const noteField: Field = { key: "notes", label: "Notes", optional: true };
export const recordFields: Record<Exclude<Entity, "invoices">, Field[]> = {
  expenses: [dateField, { key: "vendor", label: "Vendor" }, amountField, { key: "category", label: "Category", options: Object.entries(categories).map(([key, info]) => [key, info.label]) }, { key: "businessUsePercent", label: "Business use (%)", type: "number", min: 0, max: 100 }, { key: "paymentMethod", label: "Payment method", options: methodOptions }, noteField],
  income: [dateField, { key: "source", label: "Source" }, amountField, noteField],
  clients: [{ key: "name", label: "Name" }, { key: "company", label: "Company", optional: true }, { key: "email", label: "Email", type: "email", optional: true }, { key: "phone", label: "Phone", optional: true }, { key: "address", label: "Address", optional: true }, noteField],
  "estimated-payments": [{ key: "taxYear", label: "Tax year", options: [["2026", "2026"]] }, { key: "quarter", label: "Quarter", options: [1, 2, 3, 4].map(n => [String(n), `Quarter ${n}`]) }, dateField, amountField, { key: "confirmation", label: "Confirmation", optional: true }, noteField],
};
const descriptions: Record<Entity, [string, string, string]> = {
  expenses: ["Expenses", "Keep every business cost and its deductible share in view.", "expense"], income: ["Income", "Manual receipts and paid invoices, together in one ledger.", "income"], clients: ["Clients", "The people and businesses you work with.", "client"], invoices: ["Invoices", "From first draft to payment. Keep your cash flow moving.", "invoice"], "estimated-payments": ["Estimated payments", "Record the quarterly payments you have made.", "payment"],
};

export function RecordForm({ entity, row, done, close }: { entity: Exclude<Entity, "invoices">; row?: RecordRow; done: () => void; close: () => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const body = Object.fromEntries(recordFields[entity].map(field => {
        const value = String(form.get(field.key) ?? "");
        return [field.key, field.cents ? dollarsToCents(value) : field.type === "number" || field.key === "quarter" || field.key === "taxYear" ? Number(value) : value || null];
      }));
      await api(`/api/${entity}${row ? `/${row.id}` : ""}`, row ? "PATCH" : "POST", body); done();
    } catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  return <form onSubmit={submit}><div className="form-grid">{recordFields[entity].map(field => {
    const initial = row?.[field.key] ?? (field.key === "date" ? new Date().toISOString().slice(0, 10) : field.key === "businessUsePercent" ? 100 : field.key === "category" || field.key === "paymentMethod" ? "OTHER" : field.key === "taxYear" ? 2026 : "");
    const value = field.cents && typeof initial === "number" ? moneyText(initial) : String(initial).slice(0, field.type === "date" ? 10 : undefined);
    return <label className="field" key={field.key}>{field.label}{field.options ? <select name={field.key} defaultValue={value || field.options[0][0]}>{field.options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <input name={field.key} type={field.type ?? "text"} defaultValue={value} required={!field.optional} min={field.min} max={field.max} step={field.step ?? (field.type === "number" ? "1" : undefined)} maxLength={field.key === "notes" || field.key === "address" ? 2000 : 200} />}</label>;
  })}</div>{entity === "expenses" && <p className="muted small">Meals are 50% deductible after applying business use. Other categories use 100%.</p>}{error && <ErrorBox message={error} />}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button" disabled={pending}>{pending ? "Saving…" : "Save entry"}</button></div></form>;
}

export function RecordsPage({ entity }: { entity: Entity }) {
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [sort, setSort] = useState(""); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RecordRow | "new" | null>(null); const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [pending, setPending] = useState(false);
  const query = new URLSearchParams({ search, page: String(page), pageSize: "10", ...(sort ? { sort } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(filter ? entity === "expenses" ? { category: filter } : { status: filter } : {}) });
  const resource = useResource<{ data: RecordRow[]; pagination: { total: number; pages: number } }>(`/api/${entity}?${query}`);
  const [title, description, singular] = descriptions[entity];
  const reset = (set: (s: string) => void, value: string) => { set(value); setPage(1); };
  const saved = () => { setEditing(null); setNotice("Saved successfully."); resource.refresh(); };
  async function mutate(row: RecordRow, status?: string) {
    setPending(true); setError("");
    try { await api(`/api/${entity}/${row.id}`, status ? "PATCH" : "DELETE", status ? { status } : undefined); setDeleting(null); setNotice(status ? "Invoice updated." : "Entry deleted."); resource.refresh(); }
    catch (error) { setError((error as Error).message); } finally { setPending(false); }
  }
  const date = (value?: string) => value?.slice(0, 10) ?? "—";
  const sortOptions = entity === "expenses" ? ["date", "vendor", "amountCents", "category"] : entity === "income" ? ["date", "source", "amountCents"] : entity === "clients" ? ["name", "company", "createdAt"] : entity === "invoices" ? ["issueDate", "dueDate", "number", "totalCents"] : ["date", "quarter", "amountCents"];
  return <><PageTitle title={title} description={description} action={<button className="button" onClick={() => setEditing("new")}><Plus size={17} />Add {singular}</button>} />
    <div className="toolbar"><label className="search-field"><Search size={17} /><input aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={e => reset(setSearch, e.target.value)} /></label>
      {(entity === "expenses" || entity === "invoices") && <select aria-label="Filter" value={filter} onChange={e => reset(setFilter, e.target.value)}><option value="">All {entity === "expenses" ? "categories" : "statuses"}</option>{(entity === "expenses" ? Object.entries(categories).map(([key, c]) => [key, c.label]) : ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"].map(s => [s, s])).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
      <label className="filter-label">From<input aria-label="From date" type="date" value={from} onChange={e => reset(setFrom, e.target.value)} /></label><label className="filter-label">To<input aria-label="To date" type="date" value={to} onChange={e => reset(setTo, e.target.value)} /></label>
      <select aria-label="Sort descending by" value={sort} onChange={e => reset(setSort, e.target.value)}><option value="">Sort: default</option>{sortOptions.map(s => <option key={s} value={s}>{s.replace("Cents", "").replace(/([A-Z])/g, " $1")} ↓</option>)}</select></div>
    {notice && <p role="status" className="success-message">{notice}</p>}{error && <ErrorBox message={error} />}{resource.error && <ErrorBox message={resource.error} retry={resource.refresh} />}{resource.loading && <Loading />}
    {resource.data && (resource.data.data.length ? <div className="panel table-wrap"><table><thead><tr>{(entity === "clients" ? ["Name / company", "Email", "Phone"] : entity === "invoices" ? ["Invoice / client", "Due date", "Status", "Total"] : entity === "expenses" ? ["Date / vendor", "Category", "Business use", "Amount"] : entity === "income" ? ["Date / source", "Type", "Amount"] : ["Date", "Quarter", "Amount"]).map(label => <th key={label}>{label}</th>)}<th>Actions</th></tr></thead><tbody>{resource.data.data.map(row => <tr key={row.id}>
      {entity === "clients" ? <><td><strong>{row.name}</strong><small>{row.company}</small></td><td>{row.email || "—"}</td><td>{row.phone || "—"}</td></> : entity === "invoices" ? <><td><Link className="text-link" href={`/invoices/${row.id}/print`}>{row.number}</Link><small>{row.client?.company || row.client?.name}</small></td><td>{date(row.dueDate)}</td><td><Status value={row.status!} /></td><td className="numeric">{formatMoney(row.totalCents!)}</td></> : <><td><small>{date(row.date)}</small><strong>{row.vendor || row.source || row.confirmation || "Estimated payment"}</strong></td>{entity === "expenses" ? <><td>{categories[row.category!].label}</td><td>{row.businessUsePercent}%</td></> : entity === "income" ? <td>{row.invoiceId ? <Link className="text-link" href={`/invoices/${row.invoiceId}/print`}>Invoice receipt</Link> : "Manual"}</td> : <td>Q{row.quarter} · {row.taxYear}</td>}<td className="numeric">{formatMoney(row.amountCents!)}</td></>}
      <td><div className="row-actions">{!row.invoiceId && <><button className="icon-button" aria-label={`Edit ${row.number || row.name || row.vendor || row.source || "payment"}`} onClick={() => setEditing(row)} disabled={entity === "invoices" && ["PAID", "VOID"].includes(row.status!)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Delete ${row.number || row.name || row.vendor || row.source || "payment"}`} onClick={() => setDeleting(row)}><Trash2 size={15} /></button></>}
      {entity === "invoices" && <>{row.status === "DRAFT" && <button className="text-button" disabled={pending} onClick={() => mutate(row, "SENT")}>Send</button>}{["SENT", "OVERDUE"].includes(row.status!) && <button className="text-button" disabled={pending} onClick={() => mutate(row, "PAID")}>Mark paid</button>}{row.status === "PAID" && <button className="text-button" disabled={pending} onClick={() => mutate(row, "SENT")}>Un-pay</button>}{row.status === "VOID" ? <button className="text-button" disabled={pending} onClick={() => mutate(row, "DRAFT")}>Reopen</button> : <button className="text-button" disabled={pending} onClick={() => mutate(row, "VOID")}>Void</button>}</>}</div></td>
    </tr>)}</tbody></table></div> : <Empty title={`No ${title.toLowerCase()} found`} message={`Add a ${singular}, or adjust your search and filters.`} />)}
    {resource.data && <div className="pagination"><span>{resource.data.pagination.total} entries · page {page} of {Math.max(1, resource.data.pagination.pages)}</span><div><button className="button secondary" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button><button className="button secondary" disabled={page >= resource.data.pagination.pages} onClick={() => setPage(n => n + 1)}>Next</button></div></div>}
    {editing && <Modal title={`${editing === "new" ? "Add" : "Edit"} ${singular}`} close={() => setEditing(null)}>{entity === "invoices" ? <InvoiceEditor row={editing === "new" ? undefined : editing} done={saved} close={() => setEditing(null)} /> : <RecordForm entity={entity} row={editing === "new" ? undefined : editing} done={saved} close={() => setEditing(null)} />}</Modal>}
    {deleting && <Modal title={`Delete ${singular}?`} close={() => setDeleting(null)}><p>This removes the entry permanently.{entity === "invoices" && " Linked invoice income will also be removed."}</p>{error && <ErrorBox message={error} />}<div className="form-actions"><button className="button secondary" onClick={() => setDeleting(null)}>Cancel</button><button className="button danger-button" disabled={pending} onClick={() => mutate(deleting)}>Delete entry</button></div></Modal>}
  </>;
}
