"use client";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { notify } from "@/components/notifications";

export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  try {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) {
    const details = payload.error?.details?.fieldErrors as Record<string, string[]> | undefined;
    const fields = details ? Object.entries(details).map(([field, errors]) => `${field}: ${errors.join(" ")}`).join(" ") : "";
    throw new Error([payload.error?.message || "Request failed. Please try again.", fields].filter(Boolean).join(" "));
  }
  if (method !== "GET") notify(method === "DELETE" ? "Deleted successfully." : url.includes("categorize") ? "Category suggested. Review before saving." : url.includes("preview") ? "Import preview ready." : "Saved successfully.");
  return payload;
  } catch (error) { if (method !== "GET") notify((error as Error).message, "error"); throw error; }
}
export async function downloadCsv(url: string, filename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) { const payload = await response.json(); throw new Error(payload.error?.message || "Export failed."); }
    const href = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = href; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000); notify("CSV exported.");
  } catch (error) { notify((error as Error).message, "error"); }
}
export function useResource<T>(url: string) {
  const [revision, setRevision] = useState(0);
  const key = `${url}|${revision}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: "" });
  useEffect(() => {
    let active = true;
    api<T>(url).then(data => { if (active) setState({ key, data }); }).catch(error => { if (active) setState({ key, error: error.message }); });
    return () => { active = false; };
  }, [url, key]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: state.key !== key, refresh: () => setRevision(n => n + 1) };
}
export function PageTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title page-top"><div><span className="eyebrow">Your business, in focus</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-message" role="alert">{message}{retry && <button className="text-button" onClick={retry}>Try again</button>}</div>;
}
export function Loading() { return <div className="panel loading" role="status" aria-label="Loading your workspace"><div className="skeleton skeleton-title" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><span className="sr-only">Loading your workspace…</span></div>; }
export function Empty({ title = "Nothing here yet", message = "Add your first entry to get started." }: { title?: string; message?: string }) {
  return <div className="empty-panel"><span className="eyebrow">A fresh start</span><h2>{title}</h2><p>{message}</p></div>;
}
export function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="editor-dialog" aria-labelledby={titleId} onCancel={close}><div className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X size={20} /></button></div>{children}</dialog>;
}
export function Disclaimer() {
  return <p className="disclaimer tax-note">Estimates are for planning purposes and are not tax advice. US federal, 2026; USD only. Simplified QBI assumes below-threshold eligibility. State taxes, credits, W-2 wages, capital gains, and withholding are excluded.</p>;
}
export function Status({ value }: { value: string }) { return <span className={`status status-${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>; }
