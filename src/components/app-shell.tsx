"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ReceiptText, ArrowDownLeft, FileText, Users, Calculator, Settings, ShieldCheck, LogOut, Menu, X, LockKeyhole } from "lucide-react";
import { Brand } from "./brand";

const navigation = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", Icon: ReceiptText },
  { href: "/income", label: "Income", Icon: ArrowDownLeft },
  { href: "/invoices", label: "Invoices", Icon: FileText },
  { href: "/clients", label: "Clients", Icon: Users },
  { href: "/tax-estimator", label: "Tax Estimator", Icon: Calculator },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function AppShell({ user, children }: { user: { name: string; role: "USER" | "ADMIN" }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const links = user.role === "ADMIN" ? [...navigation, { href: "/admin", label: "Admin", Icon: ShieldCheck }] : navigation;
  const current = pathname.startsWith("/estimated-payments") ? "Estimated payments" : links.find(link => pathname.startsWith(link.href))?.label ?? "Workspace";
  async function logout() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login"); router.refresh();
    } catch { setError("Couldn’t log out. Please try again."); }
    finally { setPending(false); }
  }
  return <div className="app-layout"><aside id="workspace-navigation" className={`sidebar${open ? " open" : ""}`}><Brand /><div className="nav-label">Your workspace</div><nav aria-label="Workspace">{links.map(({ href, label, Icon }) => <Link href={href} key={href} className={pathname.startsWith(href) ? "active" : ""} aria-current={pathname.startsWith(href) ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav><div className="sidebar-bottom"><div className="profile"><span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span><div><div className="profile-name">{user.name}</div><div className="profile-role">{user.role === "ADMIN" ? "Administrator" : "Independent professional"}</div></div></div><button className="signout" disabled={pending} onClick={logout}><LogOut size={16} />{pending ? "Logging out…" : "Log out"}</button>{error && <p className="error-message" role="alert">{error}</p>}</div></aside><div className="workspace"><header className="workspace-header"><span className="desktop-label">Workspace <span style={{ padding: "0 12px", color: "#a9b6ae" }}>/</span> <strong style={{ color: "var(--ink)" }}>{current}</strong></span><button className="mobile-menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="workspace-navigation" aria-label={open ? "Close navigation" : "Open navigation"}>{open ? <X size={20} /> : <Menu size={20} />}<strong>TaxWise</strong></button><span style={{ display: "flex", gap: 7, alignItems: "center" }}><LockKeyhole size={13} /> Your private workspace</span></header><main className="workspace-main">{children}</main></div></div>;
}
