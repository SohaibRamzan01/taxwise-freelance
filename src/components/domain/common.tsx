"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) {
    const details = payload.error?.details?.fieldErrors as Record<string, string[]> | undefined;
    const fields = details ? Object.entries(details).map(([field, errors]) => `${field}: ${errors.join(" ")}`).join(" ") : "";
    throw new Error([payload.error?.message || "Request failed. Please try again.", fields].filter(Boolean).join(" "));
  }
  return payload;
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
export function Loading() { return <div className="panel loading" role="status">Loading your workspace…</div>; }
export function Empty({ title = "Nothing here yet", message = "Add your first entry to get started." }: { title?: string; message?: string }) {
  return <div className="empty-panel"><span className="eyebrow">A fresh start</span><h2>{title}</h2><p>{message}</p></div>;
}
export function Modal({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="editor-dialog" aria-labelledby="dialog-title" onCancel={close}><div className="dialog-header"><h2 id="dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={close}><X size={20} /></button></div>{children}</dialog>;
}
export function Disclaimer() {
  return <p className="disclaimer tax-note">Estimates are for planning purposes and are not tax advice. US federal, 2026; USD only. Simplified QBI assumes below-threshold eligibility. State taxes, credits, W-2 wages, capital gains, and withholding are excluded.</p>;
}
export function Status({ value }: { value: string }) { return <span className={`status status-${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>; }
