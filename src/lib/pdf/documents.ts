import PDFDocument from "pdfkit";
import { formatMoney } from "@/lib/money";
import type { TaxSummary } from "@/lib/reports/summary";
type Doc = PDFKit.PDFDocument;
const ink = "#14213D", muted = "#44506A";
function document(title: string, render: (doc: Doc) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: title, Creator: "TaxWise Freelance" } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(chunk)); doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      doc.font("Helvetica").fontSize(10).fillColor(ink);
      render(doc);
      const range = doc.bufferedPageRange();
      for (let page = range.start; page < range.start + range.count; page++) {
        doc.switchToPage(page);
        // Footer sits outside the content margin; avoid PDFKit flowing it onto a new page.
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font("Helvetica").fontSize(8).fillColor(muted).text(`TaxWise Freelance  |  ${page + 1} / ${range.count}`, 48, doc.page.height - 30, { width: 499, lineBreak: false });
        doc.page.margins.bottom = bottom;
      }
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
function space(doc: Doc, height: number) {
  if (doc.y + height > doc.page.height - 60) doc.addPage();
}
function heading(doc: Doc, title: string) {
  space(doc, 45); doc.moveDown(0.8).font("Helvetica-Bold").fontSize(13).fillColor(ink).text(title, 48, doc.y, { width: 499 }); doc.moveDown(0.5).font("Helvetica").fontSize(10);
}
function paragraph(doc: Doc, value: string, size = 10) {
  doc.font("Helvetica").fontSize(size).fillColor(ink).text(value, 48, doc.y, { width: 499, lineGap: 3 }).moveDown(0.5);
}
function row(doc: Doc, cells: string[], widths: number[], bold = false) {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(ink);
  const height = Math.max(...cells.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 14 }))) + 16;
  space(doc, height); const y = doc.y; let x = 48;
  cells.forEach((cell, i) => { doc.text(cell, x + 5, y + 6, { width: widths[i] - 14, align: i === cells.length - 1 ? "right" : "left" }); x += widths[i]; });
  doc.moveTo(48, y + height).lineTo(547, y + height).strokeColor("#DCE2EA").lineWidth(0.5).stroke(); doc.x = 48; doc.y = y + height;
}
function title(doc: Doc, label: string, subtitle: string) {
  doc.font("Helvetica-Bold").fontSize(25).fillColor(ink).text(label, { width: 499 }).moveDown(0.3);
  doc.font("Helvetica").fontSize(11).fillColor(muted).text(subtitle, { width: 499 }).moveDown();
}
export interface InvoicePdfInput {
  number: string; status: string; issueDate: string; dueDate: string; paidAt?: string | null; currency: string;
  business: { name: string; address?: string | null; email?: string | null; phone?: string | null };
  client: { name: string; company?: string | null; email?: string | null; address?: string | null };
  items: { description: string; quantity: string; unitPriceCents: number; amountCents: number }[];
  subtotalCents: number; discountCents: number; taxRateBasisPoints: number; taxCents: number; totalCents: number; notes?: string | null; terms?: string | null;
}
export function invoicePdf(invoice: InvoicePdfInput) {
  return document(`Invoice ${invoice.number}`, doc => {
    title(doc, `INVOICE ${invoice.number}`, `${invoice.status}  |  Issued ${invoice.issueDate}  |  Due ${invoice.dueDate}  |  ${invoice.currency}`);
    heading(doc, invoice.business.name); paragraph(doc, [invoice.business.address, invoice.business.email, invoice.business.phone].filter(Boolean).join("\n"));
    heading(doc, "Bill to"); paragraph(doc, [invoice.client.company, invoice.client.name, invoice.client.email, invoice.client.address].filter(Boolean).join("\n"));
    if (invoice.paidAt) paragraph(doc, `Paid on ${invoice.paidAt}`);
    heading(doc, "Services & items"); row(doc, ["Description", "Qty", "Unit price", "Amount"], [254, 45, 100, 100], true);
    for (const item of invoice.items) row(doc, [item.description, item.quantity, formatMoney(item.unitPriceCents), formatMoney(item.amountCents)], [254, 45, 100, 100]);
    doc.moveDown();
    for (const [label, amount] of [["Subtotal", invoice.subtotalCents], ["Discount", -invoice.discountCents], [`Tax (${invoice.taxRateBasisPoints / 100}%)`, invoice.taxCents], ["Total", invoice.totalCents]] as const) row(doc, [label, formatMoney(amount)], [349, 150], label === "Total");
    if (invoice.notes) { heading(doc, "Notes"); paragraph(doc, invoice.notes); }
    if (invoice.terms) { heading(doc, "Payment terms"); paragraph(doc, invoice.terms); }
    heading(doc, "Thank you for your business.");
  });
}
export function taxSummaryPdf(summary: TaxSummary) {
  return document(`Tax summary ${summary.period.label}`, doc => {
    title(doc, "Tax-ready summary", `${summary.period.label}  |  ${summary.period.from} to ${summary.period.to}`);
    paragraph(doc, `${summary.profile.businessName || summary.profile.name}\n${summary.profile.name} | ${summary.profile.email}${summary.profile.businessAddress ? `\n${summary.profile.businessAddress}` : ""}`);
    paragraph(doc, `As of ${summary.asOf} | ${summary.profile.filingStatus.replaceAll("_", " ")} | USD`, 9);
    paragraph(doc, summary.calculationNote, 9);
    heading(doc, "Income & deductions");
    row(doc, ["Income received", formatMoney(summary.incomeCents)], [349, 150], true);
    row(doc, ["Category / Schedule C line", "Expenses", "Deductible"], [279, 110, 110], true);
    for (const group of summary.groups) row(doc, [`${group.label} / ${group.scheduleC}`, formatMoney(group.expenseCents), formatMoney(group.deductibleCents)], [279, 110, 110]);
    row(doc, ["Total", formatMoney(summary.expenseCents), formatMoney(summary.deductionsCents)], [279, 110, 110], true);
    heading(doc, "Period tax calculation (actual earnings)");
    const e = summary.estimate;
    for (const [label, value] of [["Net business profit", summary.netProfitCents], ["Self-employment tax (including additional Medicare)", e.se.totalCents], ["Half-SE deduction", e.se.halfDeductionCents], ["Standard deduction", e.standardDeductionCents], ["QBI deduction (simplified)", e.qbi.deductionCents], ["Taxable income", e.federal.taxableIncomeCents], ["Federal income tax", e.federal.totalCents], ["Total estimated federal tax", e.totalTaxCents], ["Payments assigned to selected period", summary.paymentsCents]] as const) row(doc, [label, formatMoney(value)], [349, 150]);
    heading(doc, "Tax-year payment plan (YTD actual earnings)");
    paragraph(doc, `Method: ${summary.schedule.method.replaceAll("_", " ")}. Annual rules applied to YTD actual earnings, without annualisation. Quarterly remaining amounts are cumulative and include prior-quarter balances.`, 9);
    for (const [label, value] of [["YTD estimated federal tax", summary.ytdEstimate.totalTaxCents], ["Required annual payment target", summary.schedule.requiredAnnualCents], ["All tax-year payments made", summary.schedule.paidSoFarCents], ["Remaining payment target", summary.schedule.remainingCents], ["Estimated tax balance after payments", summary.schedule.estimatedBalanceCents]] as const) row(doc, [label, formatMoney(value)], [349, 150]);
    row(doc, ["Quarter / due", "Target", "Paid", "Remaining*"], [199, 100, 100, 100], true);
    for (const q of summary.schedule.quarters) row(doc, [`Q${q.quarter} / ${q.dueDate}`, formatMoney(q.requiredCents), formatMoney(q.paidCents), formatMoney(q.remainingCents)], [199, 100, 100, 100]);
    if (summary.payments.length) {
      heading(doc, "Recorded payments for selected period");
      for (const p of summary.payments) row(doc, [`${p.date} / Q${p.quarter}`, formatMoney(p.amountCents)], [349, 150]);
    }
    heading(doc, "Planning disclaimer"); paragraph(doc, summary.disclaimer, 9);
  });
}
export function pdfResponse(bytes: Buffer, filename: string) {
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": String(bytes.length) } });
}
