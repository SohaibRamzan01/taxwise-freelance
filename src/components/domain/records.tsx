"use client";
import { categoryColors } from "@/lib/category-colors";
import Link from "next/link";
import { useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { categories, deductibleAmount } from "@/lib/tax";
import { dollarsToCents, formatMoney, moneyText } from "@/lib/money";
import type { Entity } from "@/lib/domain/validation";
import { api, downloadCsv, Empty, ErrorBox, Loading, Modal, PageTitle, Status, useResource } from "./common";
import { InvoiceEditor } from "./invoice-editor";
import { ReceiptScanner } from "./receipt-scanner";
import { ExpenseImport } from "./expense-import";
import { notify } from "@/components/notifications";
import type { Suggestion } from "@/lib/ai";

export interface ItemRow { description: string; quantity: string | number; unitPriceCents: number; amountCents?: number }
export interface RecordRow {
  receipt?: { id: string } | null;
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

export function RecordForm({ entity, row, initial, receiptId, done, close }: { entity: Exclude<Entity, "invoices">; row?: RecordRow; initial?: Partial<RecordRow>; receiptId?: string; done: () => void; close: () => void }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion>();
  async function suggest() {
    setSuggesting(true); setError("");
    try {
      const data = new FormData(formRef.current!);
      const result = await api<{ data: Suggestion }>("/api/expenses/categorize", "POST", { vendor: String(data.get("vendor") || ""), description: String(data.get("notes") || ""), amount: dollarsToCents(String(data.get("amountCents") || "0")) });
      const category = formRef.current?.elements.namedItem("category") as HTMLSelectElement | null;
      if (category) category.value = result.data.category;
      setSuggestion(result.data);
    } catch (error) { setError((error as Error).message); notify((error as Error).message, "error"); }
    finally { setSuggesting(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const body = Object.fromEntries(recordFields[entity].map(field => {
        const value = String(form.get(field.key) ?? "");
        return [field.key, field.cents ? dollarsToCents(value) : field.type === "number" || field.key === "quarter" || field.key === "taxYear" ? Number(value) : value || null];
      }));
      if (receiptId && entity === "expenses" && !row) body.receiptId = receiptId;
      await api(`/api/${entity}${row ? `/${row.id}` : ""}`, row ? "PATCH" : "POST", body); done();
    } catch (error) { setError((error as Error).message); notify((error as Error).message, "error"); } finally { setPending(false); }
  }
  return <form ref={formRef} onSubmit={submit}><fieldset disabled={pending || suggesting}><div className="form-grid">{recordFields[entity].map(field => {
    const fieldInitial = row?.[field.key] ?? initial?.[field.key] ?? (field.key === "date" ? new Date().toISOString().slice(0, 10) : field.key === "businessUsePercent" ? 100 : field.key === "category" || field.key === "paymentMethod" ? "OTHER" : field.key === "taxYear" ? 2026 : "");
    const value = field.cents && typeof fieldInitial === "number" ? moneyText(fieldInitial) : String(fieldInitial).slice(0, field.type === "date" ? 10 : undefined);
    return <label className="field" key={field.key}>{field.label}{field.options ? <select name={field.key} defaultValue={value || field.options[0][0]}>{field.options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <input name={field.key} type={field.type ?? "text"} defaultValue={value} required={!field.optional} min={field.min} max={field.max} step={field.step ?? (field.type === "number" ? "1" : undefined)} maxLength={field.key === "notes" || field.key === "address" ? 2000 : 200} />}</label>;
  })}</div></fieldset>{entity === "expenses" && <><button type="button" className="button secondary editor-section" disabled={pending || suggesting} onClick={suggest}>{suggesting ? "Suggesting..." : "Suggest category"}</button>{suggestion && <p className="small" role="status">{suggestion.source === "ai" ? "AI" : "Rules"} suggestion: {categories[suggestion.category].label} - {Math.round(suggestion.confidence * 100)}% confidence. Review before saving.</p>}</>}{entity === "expenses" && <p className="muted small">Meals are 50% deductible after applying business use. Other categories use 100%.</p>}{error && <ErrorBox message={error} />}<div className="form-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button" disabled={pending || suggesting}>{pending ? "Saving…" : "Save entry"}</button></div></form>;
}

export function RecordsPage({ entity, initialSearch = "" }: { entity: Entity; initialSearch?: string }) {
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({ key: "", ids: [] });
  const [bulkCategory, setBulkCategory] = useState("OTHER");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusChange, setStatusChange] = useState<{ row: RecordRow; status: string } | null>(null);
  const [search, setSearch] = useState(initialSearch); const [filter, setFilter] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [sort, setSort] = useState(""); const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RecordRow | "new" | null>(null); const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [pending, setPending] = useState(false);
  const query = new URLSearchParams({ search, page: String(page), pageSize: "10", ...(sort ? { sort } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(filter ? entity === "expenses" ? { category: filter } : { status: filter } : {}) });
  const resource = useResource<{ data: RecordRow[]; pagination: { total: number; pages: number }; totals?: { amountCents: number; deductibleCents: number } }>(`/api/${entity}?${query}`);
  const selectionKey = query.toString();
  const selected = selection.key === selectionKey ? selection.ids : [];
  const select = (ids: string[]) => setSelection({ key: selectionKey, ids });
  async function bulk(action: "delete" | "categorize") {
    setPending(true); setError("");
    try { await api("/api/expenses/bulk", "POST", { action, ids: selected, ...(action === "categorize" ? { category: bulkCategory } : {}) }); select([]); setBulkDeleting(false); resource.refresh(); }
    catch (e) { setError((e as Error).message); } finally { setPending(false); }
  }
  const [title, description, singular] = descriptions[entity];
  const reset = (set: (s: string) => void, value: string) => { set(value); setPage(1); };
  const saved = () => { setEditing(null); setScanning(false); setImporting(false); select([]); setNotice("Saved successfully."); resource.refresh(); };
  async function mutate(row: RecordRow, status?: string) {
    setPending(true); setError("");
    try { await api(`/api/${entity}/${row.id}`, status ? "PATCH" : "DELETE", status ? { status } : undefined); setDeleting(null); setStatusChange(null); select([]); setNotice(status ? "Invoice updated." : "Entry deleted."); resource.refresh(); }
    catch (error) { setError((error as Error).message); notify((error as Error).message, "error"); } finally { setPending(false); }
  }
  const date = (value?: string) => value?.slice(0, 10) ?? "—";
  const sortOptions = entity === "expenses" ? ["date", "vendor", "amountCents", "category"] : entity === "income" ? ["date", "source", "amountCents"] : entity === "clients" ? ["name", "company", "createdAt"] : entity === "invoices" ? ["issueDate", "dueDate", "number", "totalCents"] : ["date", "quarter", "amountCents"];
  return <><PageTitle title={title} description={description} action={<div className="row-actions">{(entity === "expenses" || entity === "income") && <button className="button secondary" onClick={() => void downloadCsv(`/api/${entity}/export?${query}`, `${entity}.csv`)}>Export CSV</button>}{entity === "expenses" && <button className="button secondary" onClick={() => setImporting(true)}>Import CSV</button>}{entity === "expenses" && <button className="button secondary" onClick={() => setScanning(true)}>Scan receipt</button>}<button className="button" onClick={() => setEditing("new")}><Plus size={17} />Add {singular}</button></div>} />
    <div className="toolbar"><label className="search-field"><Search size={17} /><input aria-label={`Search ${title}`} placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={e => reset(setSearch, e.target.value)} /></label>
      {(entity === "expenses" || entity === "invoices") && <select aria-label="Filter" value={filter} onChange={e => reset(setFilter, e.target.value)}><option value="">All {entity === "expenses" ? "categories" : "statuses"}</option>{(entity === "expenses" ? Object.entries(categories).map(([key, c]) => [key, c.label]) : ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"].map(s => [s, s])).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>}
      <label className="filter-label">From<input aria-label="From date" type="date" value={from} onChange={e => reset(setFrom, e.target.value)} /></label><label className="filter-label">To<input aria-label="To date" type="date" value={to} onChange={e => reset(setTo, e.target.value)} /></label>
      <select aria-label="Sort descending by" value={sort} onChange={e => reset(setSort, e.target.value)}><option value="">Sort: default</option>{sortOptions.map(s => <option key={s} value={s}>{s.replace("Cents", "").replace(/([A-Z])/g, " $1")} ↓</option>)}</select></div>
    {entity === "expenses" && selected.length > 0 && <div className="toolbar panel"><strong>{selected.length} selected</strong><select aria-label="Bulk expense category" value={bulkCategory} disabled={pending} onChange={e => setBulkCategory(e.target.value)}>{Object.entries(categories).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}</select><button className="button secondary" disabled={pending} onClick={() => void bulk("categorize")}>Apply category</button><button className="button danger-button" disabled={pending} onClick={() => setBulkDeleting(true)}>Delete selected</button><button className="text-button" disabled={pending} onClick={() => select([])}>Clear selection</button></div>}
    {notice && <p role="status" className="success-message">{notice}</p>}{error && <ErrorBox message={error} />}{resource.error && <ErrorBox message={resource.error} retry={resource.refresh} />}{resource.loading && <Loading />}
    {resource.data && (resource.data.data.length ? <div className="panel table-wrap"><table role="table" aria-label={title} className={`record-table${entity === "expenses" ? " expense-table" : ""}`}><thead><tr>{entity === "expenses" && <th scope="col" className="record-selection"><label><input type="checkbox" aria-label="Select all expenses on this page" disabled={pending} checked={resource.data.data.length > 0 && resource.data.data.every(row => selected.includes(row.id))} onChange={e => select(e.target.checked ? resource.data!.data.map(row => row.id) : [])} /><span className="mobile-table-label">Select all expenses on this page</span></label></th>}{(entity === "clients" ? ["Name / company", "Email", "Phone"] : entity === "invoices" ? ["Invoice / client", "Due date", "Status", "Total"] : entity === "expenses" ? ["Date / vendor", "Category", "Business use", "Amount", "Deductible"] : entity === "income" ? ["Date / source", "Type", "Amount"] : ["Date", "Quarter", "Amount"]).map(label => <th scope="col" key={label} className={["Amount", "Deductible", "Total"].includes(label) ? "numeric" : undefined}>{label}</th>)}<th scope="col">Actions</th></tr></thead><tbody>{resource.data.data.map(row => <tr key={row.id}>
      {entity === "expenses" && <td data-label="Select"><input type="checkbox" aria-label={`Select expense ${row.vendor}`} disabled={pending} checked={selected.includes(row.id)} onChange={e => select(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))} /></td>}
      {entity === "clients" ? <><td data-label="Name / company" className="record-heading"><strong>{row.name}</strong><small>{row.company}</small></td><td data-label="Email">{row.email || "—"}</td><td data-label="Phone">{row.phone || "—"}</td></> : entity === "invoices" ? <><td data-label="Invoice / client" className="record-heading"><Link className="text-link mono" href={`/invoices/${row.id}/print`}>{row.number}</Link><small>{row.client?.company || row.client?.name}</small></td><td data-label="Due date" className="mono">{date(row.dueDate)}</td><td data-label="Status"><Status value={row.status!} /></td><td data-label="Total" className="numeric record-total"><span className="money">{formatMoney(row.totalCents!)}</span></td></> : <><td data-label={entity === "expenses" ? "Date / vendor" : entity === "income" ? "Date / source" : "Date"} className="record-heading"><small className="mono">{date(row.date)}</small><strong>{row.vendor || row.source || row.confirmation || "Estimated payment"}</strong>{row.receipt && <a className="text-link small" href={`/api/receipts/${row.receipt.id}`} target="_blank" rel="noreferrer">View receipt</a>}</td>{entity === "expenses" ? <><td data-label="Category"><span className="category-chip" style={{ background: categoryColors[row.category!] }}>{categories[row.category!].label}</span></td><td data-label="Business use">{row.businessUsePercent}%</td></> : entity === "income" ? <td data-label="Type">{row.invoiceId ? <Link className="text-link" href={`/invoices/${row.invoiceId}/print`}>Invoice receipt</Link> : "Manual"}</td> : <td data-label="Quarter">Q{row.quarter} · {row.taxYear}</td>}<td className={`numeric ${entity === "expenses" || entity === "estimated-payments" ? "out" : ""}`} data-label="Amount"><span className="money">{formatMoney(row.amountCents!)}</span></td>{entity === "expenses" && <td className="numeric" data-label="Deductible"><span className="money">{formatMoney(deductibleAmount(row.amountCents!, row.businessUsePercent!, row.category!))}</span></td>}</>}
      <td data-label="Actions"><div className="row-actions">{!row.invoiceId && <><button className="icon-button" aria-label={`Edit ${row.number || row.name || row.vendor || row.source || "payment"}`} onClick={() => setEditing(row)} disabled={entity === "invoices" && ["PAID", "VOID"].includes(row.status!)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Delete ${row.number || row.name || row.vendor || row.source || "payment"}`} onClick={() => setDeleting(row)}><Trash2 size={15} /></button></>}
      {entity === "invoices" && <><a className="text-link" href={`/api/invoices/${row.id}/pdf`}>PDF</a>{row.status === "DRAFT" && <button className="text-button" disabled={pending} onClick={() => mutate(row, "SENT")}>Send</button>}{["SENT", "OVERDUE"].includes(row.status!) && <button className="text-button" disabled={pending} onClick={() => mutate(row, "PAID")}>Mark paid</button>}{row.status === "PAID" && <button className="text-button" disabled={pending} onClick={() => setStatusChange({ row, status: "SENT" })}>Un-pay</button>}{row.status === "VOID" ? <button className="text-button" disabled={pending} onClick={() => mutate(row, "DRAFT")}>Reopen</button> : <button className="text-button" disabled={pending} onClick={() => setStatusChange({ row, status: "VOID" })}>Void</button>}</>}</div></td>
    </tr>)}</tbody></table></div> : <Empty title={`No ${title.toLowerCase()} found`} message={`Add a ${singular}, or adjust your search and filters.`} />)}
    {entity === "expenses" && resource.data?.totals && <p className="expense-totals"><span>Current filter: {resource.data.pagination.total} expenses</span><span>Total amount: <strong><span className="money">{formatMoney(resource.data.totals.amountCents)}</span></strong></span><span>Total deductible: <strong><span className="money">{formatMoney(resource.data.totals.deductibleCents)}</span></strong></span></p>}
    {resource.data && <div className="pagination"><span>{resource.data.pagination.total} entries · page {page} of {Math.max(1, resource.data.pagination.pages)}</span><div><button className="button secondary" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>Previous</button><button className="button secondary" disabled={page >= resource.data.pagination.pages} onClick={() => setPage(n => n + 1)}>Next</button></div></div>}
    {importing && <Modal title="Import expenses" close={() => setImporting(false)}><ExpenseImport done={saved} /></Modal>}
    {bulkDeleting && <Modal title="Delete selected expenses?" close={() => setBulkDeleting(false)}><p>Permanently delete {selected.length} expenses and their receipts?</p>{error && <ErrorBox message={error} />}<div className="form-actions"><button className="button secondary" disabled={pending} onClick={() => setBulkDeleting(false)}>Cancel</button><button className="button danger-button" disabled={pending || !selected.length} onClick={() => void bulk("delete")}>Delete expenses</button></div></Modal>}
    {statusChange && <Modal title={statusChange.status === "VOID" ? "Void invoice?" : "Remove invoice payment?"} close={() => setStatusChange(null)}><p>Any linked income will be removed from your ledger.</p>{error && <ErrorBox message={error} />}<div className="form-actions"><button className="button secondary" disabled={pending} onClick={() => setStatusChange(null)}>Cancel</button><button className="button danger-button" disabled={pending} onClick={() => void mutate(statusChange.row, statusChange.status)}>Confirm change</button></div></Modal>}
    {scanning && <Modal title="Scan receipt" close={() => setScanning(false)}><ReceiptScanner done={saved} close={() => setScanning(false)} /></Modal>}
    {editing && <Modal title={`${editing === "new" ? "Add" : "Edit"} ${singular}`} close={() => setEditing(null)}>{entity === "invoices" ? <InvoiceEditor row={editing === "new" ? undefined : editing} done={saved} close={() => setEditing(null)} /> : <RecordForm entity={entity} row={editing === "new" ? undefined : editing} done={saved} close={() => setEditing(null)} />}</Modal>}
    {deleting && <Modal title={`Delete ${singular}?`} close={() => setDeleting(null)}><p>This removes the entry permanently.{entity === "invoices" && " Linked invoice income will also be removed."}</p>{error && <ErrorBox message={error} />}<div className="form-actions"><button className="button secondary" onClick={() => setDeleting(null)}>Cancel</button><button className="button danger-button" disabled={pending} onClick={() => mutate(deleting)}>Delete entry</button></div></Modal>}
  </>;
}
