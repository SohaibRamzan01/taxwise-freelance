import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/domain/summary";
import { effectiveStatus } from "@/lib/domain/invoices";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/domain/print-button";
export const metadata = { title: "Print invoice" };
export default async function PrintInvoice({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const [invoice, profile] = await Promise.all([db.invoice.findFirst({ where: { id, userId: user.id }, include: { client: true, items: { orderBy: { position: "asc" } } } }), getSettings(user.id)]);
  if (!invoice) notFound();
  return <><div className="print-actions"><Link href="/invoices" className="text-link">← Back to invoices</Link><PrintButton /></div><article className="invoice-paper"><header className="invoice-heading"><div><span className="eyebrow">Invoice</span><h1>{invoice.number}</h1><p>{effectiveStatus(invoice, new Date().toISOString().slice(0, 10))}</p></div><div className="business-block"><h2>{profile.businessName || user.name}</h2><p>{profile.businessAddress}</p><p>{profile.businessEmail || user.email}<br />{profile.businessPhone}</p></div></header><div className="invoice-parties"><div><span className="eyebrow">Bill to</span><h3>{invoice.client.company || invoice.client.name}</h3><p>{invoice.client.name}<br />{invoice.client.email}</p><p>{invoice.client.address}</p></div><dl><dt>Issued</dt><dd>{invoice.issueDate.toISOString().slice(0, 10)}</dd><dt>Due</dt><dd>{invoice.dueDate.toISOString().slice(0, 10)}</dd><dt>Currency</dt><dd>{invoice.currency}</dd>{invoice.paidAt && <><dt>Paid</dt><dd>{invoice.paidAt.toISOString().slice(0, 10)}</dd></>}</dl></div><div className="table-wrap"><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{invoice.items.map(item => <tr key={item.id}><td>{item.description}</td><td>{item.quantity.toString()}</td><td>{formatMoney(item.unitPriceCents)}</td><td className="numeric">{formatMoney(item.amountCents)}</td></tr>)}</tbody></table></div><dl className="invoice-totals"><dt>Subtotal</dt><dd>{formatMoney(invoice.subtotalCents)}</dd><dt>Discount</dt><dd>−{formatMoney(invoice.discountCents)}</dd><dt>Tax ({invoice.taxRateBasisPoints / 100}%)</dt><dd>{formatMoney(invoice.taxCents)}</dd><dt><strong>Total</strong></dt><dd><strong>{formatMoney(invoice.totalCents)}</strong></dd></dl>{invoice.notes && <section className="invoice-notes"><h3>Notes</h3><p>{invoice.notes}</p></section>}{invoice.terms && <section className="invoice-notes"><h3>Payment terms</h3><p>{invoice.terms}</p></section>}<footer>Thank you for your business.</footer></article></>;
}
