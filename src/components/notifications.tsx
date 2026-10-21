"use client";
import { useEffect, useRef, useState } from "react";
export function notify(message: string, kind: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent("taxwise:toast", { detail: { message, kind } }));
}
export function Notifications() {
  const ref = useRef<HTMLDivElement>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: string }[]>([]);
  useEffect(() => {
    // Popovers use the native top layer, so notifications remain visible over dialogs.
    ref.current?.hidePopover();
    if (toasts.length) ref.current?.showPopover();
  }, [toasts]);
  useEffect(() => {
    let nextId = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: string }>).detail;
      const id = nextId++;
      setToasts(current => [...current.filter(t => t.message !== detail.message).slice(-3), { ...detail, id }]);
      const timer = setTimeout(() => { setToasts(current => current.filter(t => t.id !== id)); timers.delete(timer); }, 6000);
      timers.add(timer);
    };
    window.addEventListener("taxwise:toast", listener);
    return () => { window.removeEventListener("taxwise:toast", listener); timers.forEach(clearTimeout); };
  }, []);
  return <div ref={ref} popover="manual" className="toast-stack" aria-label="Notifications">{toasts.map(t => <div className={`toast toast-${t.kind}`} key={t.id} role={t.kind === "error" ? "alert" : "status"}><span>{t.message}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToasts(current => current.filter(row => row.id !== t.id))}>×</button></div>)}</div>;
}
