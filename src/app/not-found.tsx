import Link from "next/link";
export default function NotFound() {
  return <main className="container standalone-state"><section className="panel"><span className="eyebrow">404 · Page not found</span><h1>This page is out of reach</h1><p className="muted">Check the address or head back to your workspace.</p><Link className="button" href="/dashboard">Go to dashboard</Link></section></main>;
}
