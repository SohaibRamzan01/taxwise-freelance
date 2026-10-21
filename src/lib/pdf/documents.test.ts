import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { invoicePdf, taxSummaryPdf } from "./documents";
import { buildTaxSummary } from "@/lib/reports/summary";
const invoice = { number: "INV-0001", status: "PAID", currency: "USD", issueDate: "2026-06-01", dueDate: "2026-06-15", paidAt: "2026-06-12", business: { name: "Alex Studio", email: "alex@example.test", address: "Portland, OR" }, client: { name: "Jordan", company: "Cedar & Co.", email: "jordan@example.test", address: "Seattle, WA" }, items: [{ description: "Brand design", quantity: "2.5", unitPriceCents: 10000, amountCents: 25000 }], subtotalCents: 25000, discountCents: 1000, taxRateBasisPoints: 725, taxCents: 1740, totalCents: 25740, notes: "Project complete", terms: "Thank you" };
async function textAndPages(bytes: Buffer) {
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF"); expect(bytes.length).toBeGreaterThan(1000);
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const doc = await task.promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i); const content = await page.getTextContent();
    const pageText = content.items.filter(item => "str" in item).map(item => "str" in item ? item.str : "").join(" ");
    expect(pageText.replace(/TaxWise Freelance.*$/, "").trim().length).toBeGreaterThan(10);
    for (const item of content.items) if ("str" in item) { texts.push(item.str); expect(item.transform[5]).toBeGreaterThan(15); }
  }
  const pages = doc.numPages; await task.destroy(); return { text: texts.join(" "), pages };
}
describe("PDFKit documents", () => {
  it("renders a parseable invoice with profile, items, discounts, taxes and payment status", async () => {
    const { text, pages } = await textAndPages(await invoicePdf(invoice));
    expect(pages).toBe(1);
    for (const value of ["INV-0001", "Alex Studio", "Cedar & Co.", "Brand design", "$257.40", "PAID", "Payment terms"]) expect(text).toContain(value);
  });
  it("paginates long invoices without dropping items or notes", async () => {
    const { text, pages } = await textAndPages(await invoicePdf({ ...invoice, items: Array.from({ length: 50 }, (_, i) => ({ ...invoice.items[0], description: `Service ${i + 1}: ${"Detailed work ".repeat(12)}` })), notes: "Long notes ".repeat(160), terms: "Net 30 ".repeat(200) }));
    expect(pages).toBeGreaterThan(2); expect(text).toContain("Service 50"); expect(text).toContain("Payment terms");
  });
  it("renders category deductions, tax calculations, payments, schedule and disclaimer", async () => {
    const summary = buildTaxSummary({ year: 2026, asOf: "2026-10-22", profile: { name: "Alex", email: "alex@example.test", filingStatus: "SINGLE", priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false }, income: [{ date: "2026-06-01", amountCents: 10000000 }], expenses: [{ date: "2026-06-01", amountCents: 10000, category: "MEALS", businessUsePercent: 80 }], payments: [{ date: "2026-06-15", amountCents: 10000, taxYear: 2026, quarter: 2 }] });
    const { text, pages } = await textAndPages(await taxSummaryPdf(summary));
    expect(pages).toBeGreaterThan(1);
    for (const value of ["Tax-ready summary", "Meals / 24b", "$40.00", "QBI deduction", "2027-01-15", "not tax advice", "Recorded payments"]) expect(text).toContain(value);
  });
});
