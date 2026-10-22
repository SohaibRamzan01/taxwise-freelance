"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api, ErrorBox, useResource } from "./domain/common";

type Notification = { id: string; type: string; title: string; body: string; readAt: string | null };
export function NotificationBell() {
  const details = useRef<HTMLDetailsElement>(null);
  const resource = useResource<{ data: Notification[]; unreadCount: number }>("/api/notifications");
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState("");
  async function markRead(id: string) {
    setPending(id); setError("");
    try { await api(`/api/notifications/${id}`, "PATCH", { read: true }); resource.refresh(); }
    catch (error) { setError((error as Error).message); }
    finally { setPending(undefined); }
  }
  return <details className="notification-bell" ref={details} onToggle={event => { if (event.currentTarget.open) resource.refresh(); }} onKeyDown={event => { if (event.key === "Escape" && details.current) { details.current.open = false; details.current.querySelector("summary")?.focus(); } }}>
    <summary aria-label={`Notifications${resource.data ? `, ${resource.data.unreadCount} unread` : ""}`}><Bell size={19} aria-hidden="true" />{Boolean(resource.data?.unreadCount) && <span className="notification-count">{resource.data!.unreadCount}</span>}</summary>
    <section className="notification-dropdown" aria-label="Your notifications"><h2>Notifications</h2>
      {(error || resource.error) && <ErrorBox message={error || resource.error!} retry={resource.refresh} />}
      {resource.loading && <p role="status">Loading notifications...</p>}
      {resource.data && <><p className="muted small">{resource.data.unreadCount} unread. Showing up to 50 recent reminders.</p>{resource.data.data.length === 0 && <p>No notifications yet.</p>}
        <ul>{resource.data.data.map(row => <li key={row.id} className={row.readAt ? "" : "unread"}><strong>{row.title}</strong><p>{row.body}</p><div className="row-actions"><Link href={row.type === "INVOICE_OVERDUE" ? "/invoices?status=OVERDUE" : "/tax-estimator"} onClick={() => { if (details.current) details.current.open = false; }}>Review</Link>{!row.readAt && <button className="text-button" disabled={Boolean(pending)} onClick={() => markRead(row.id)}>{pending === row.id ? "Saving..." : "Mark as read"}</button>}</div></li>)}</ul></>}
    </section>
  </details>;
}
