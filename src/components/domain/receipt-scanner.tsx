"use client";
import { useEffect, useRef, useState } from "react";
import type { parseReceiptText } from "@/lib/receipts/parser";
import { categories } from "@/lib/tax/categories";
import { api, ErrorBox } from "./common";
import { RecordForm } from "./records";
type Scan = ReturnType<typeof parseReceiptText> & { receiptId: string };
export function ReceiptScanner({ done, close }: { done: () => void; close: () => void }) {
  const [scan, setScan] = useState<Scan | null>(null); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  const [manual, setManual] = useState(false); const [dragging, setDragging] = useState(false);
  const controller = useRef<AbortController | null>(null); const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  async function upload(file?: File) {
    if (!file || pending) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) { setError("Choose a JPG, PNG or WebP image, up to 5 MB."); return; }
    setPending(true); setError("");
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 45000);
    try {
      const form = new FormData(); form.set("image", file);
      const response = await fetch("/api/receipts/scan", { method: "POST", body: form, signal: abort.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Scanning failed. You can still enter the expense manually.");
      if (active.current) setScan(result.data);
    } catch (e) { if (active.current) setError((e as Error).name === "AbortError" ? "Scanning timed out. Try again or enter the expense manually." : (e as Error).message); }
    finally { clearTimeout(timer); if (active.current) setPending(false); }
  }
  async function discard() {
    if (scan) {
      try { await api(`/api/receipts/${scan.receiptId}`, "DELETE"); }
      catch (e) { setError((e as Error).message); return; }
    }
    close();
  }
  if (manual) return <RecordForm entity="expenses" done={done} close={close} />;
  return <>
    {!scan && <><div className={`receipt-drop${dragging ? " dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length !== 1) setError("Drop one receipt at a time."); else void upload(e.dataTransfer.files[0]); }}>
      <h3>Drop a receipt here</h3><p>JPG, PNG or WebP · up to 5 MB</p>
      <label className="field">Choose an image<input aria-label="Receipt image" type="file" accept="image/jpeg,image/png,image/webp" disabled={pending} onChange={e => void upload(e.target.files?.[0])} /></label>
      <label className="field">Take a photo<input aria-label="Take receipt photo" type="file" accept="image/*" capture="environment" disabled={pending} onChange={e => void upload(e.target.files?.[0])} /></label>
      <p className="small muted">Try a sample: <a className="text-link" href="/samples/hardware.png" download>Hardware</a> · <a className="text-link" href="/samples/internet.png" download>Internet</a> · <a className="text-link" href="/samples/meals.png" download>Meals</a></p>
    </div>{pending && <p role="status" aria-live="polite">Reading receipt… <progress aria-label="Scanning receipt" /> This may take up to 30 seconds.</p>}</>}
    {error && <ErrorBox message={error} />}
    {scan ? <><p className="success-message">Receipt scanned. Review every field before saving.</p><p><span className="status">Auto</span> {categories[scan.suggestion.category].label}{scan.suggestion.matchedKeyword && ` · matched “${scan.suggestion.matchedKeyword}”`}. You can change the category below.</p>
      <a className="text-link" href={`/api/receipts/${scan.receiptId}`} target="_blank" rel="noreferrer">View uploaded receipt</a>
      <details className="data-details"><summary>Recognized text</summary><pre className="receipt-text">{scan.rawText}</pre></details>
      <RecordForm entity="expenses" initial={{ vendor: scan.vendor ?? "", date: scan.date ?? "", amountCents: scan.totalCents ?? undefined, category: scan.suggestion.category }} receiptId={scan.receiptId} done={done} close={() => void discard()} />
    </> : <div className="form-actions"><button className="button secondary" onClick={() => { controller.current?.abort(); setManual(true); }}>Enter manually</button><button className="button secondary" onClick={close}>Cancel</button></div>}
  </>;
}
