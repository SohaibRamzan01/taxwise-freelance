import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecordsPage, type RecordRow } from "./records";
import { ReportsPage } from "./reports";
import { buildTaxSummary } from "@/lib/reports/summary";
import type { Entity } from "@/lib/domain/validation";

const resource = vi.hoisted(() => vi.fn());
vi.mock("./common", async importOriginal => ({
  ...await importOriginal<typeof import("./common")>(),
  useResource: resource,
}));

beforeEach(() => resource.mockReset());

function renderRecords(entity: Entity, rows: RecordRow[]) {
  resource.mockReturnValue({ data: { data: rows, pagination: { total: rows.length, pages: 1 } }, refresh: vi.fn() });
  return renderToStaticMarkup(createElement(RecordsPage, { entity }));
}

describe("record table accessibility and actions", () => {
  it.each([
    ["clients", { id: "client", name: "Long client name", company: "Studio", email: "client@example.test", phone: "123" }, ["Name / company", "Email", "Phone", "Actions"]],
    ["income", { id: "income", source: "Consulting", date: "2026-06-01", amountCents: 123456 }, ["Date / source", "Type", "Amount", "Actions"]],
    ["estimated-payments", { id: "payment", date: "2026-06-01", taxYear: 2026, quarter: 2, amountCents: 123456 }, ["Date", "Quarter", "Amount", "Actions"]],
    ["expenses", { id: "expense", vendor: "Hardware store", date: "2026-06-01", category: "COMPUTER_HARDWARE", amountCents: 123456, businessUsePercent: 100 }, ["Select", "Date / vendor", "Category", "Business use", "Amount", "Deductible", "Actions"]],
  ] satisfies [Entity, RecordRow, string[]][])("keeps %s cells labelled and edit/delete controls named", (entity, row: RecordRow, labels) => {
    const html = renderRecords(entity, [row]);
    expect(html).toContain('role="table"');
    expect(html).toContain('class="record-table');
    expect(html).toContain('scope="col"');
    expect([...html.matchAll(/<td[^>]*data-label="([^"]+)"/g)].map(match => match[1])).toEqual(labels);
    expect(html).toContain(`aria-label="Edit ${row.name || row.vendor || row.source || "payment"}"`);
    expect(html).toContain(`aria-label="Delete ${row.name || row.vendor || row.source || "payment"}"`);
    if (entity === "expenses") {
      expect(html).toContain('aria-label="Select all expenses on this page"');
      expect(html).toContain('aria-label="Select expense Hardware store"');
    }
  });

  it.each([
    ["DRAFT", "Send", "Void"], ["SENT", "Mark paid", "Void"], ["OVERDUE", "Mark paid", "Void"],
    ["PAID", "Un-pay", "Void"], ["VOID", "Reopen", null],
  ])("preserves invoice links, total and %s lifecycle controls", (status, action, otherAction) => {
    const html = renderRecords("invoices", [{ id: "invoice", number: "INV-001", client: { name: "Client studio" }, status, totalCents: 123456, dueDate: "2026-06-15" }]);
    expect(html).toContain('data-label="Invoice / client" class="record-heading"');
    expect(html).toContain('href="/invoices/invoice/print"');
    expect(html).toContain("Client studio");
    expect(html).toContain('data-label="Total" class="numeric record-total"');
    expect(html).toContain("$1,234.56");
    expect(html).toContain('href="/api/invoices/invoice/pdf"');
    expect(html).toContain(`>${action}</button>`);
    if (otherAction) expect(html).toContain(`>${otherAction}</button>`);
    expect(html).toContain('aria-label="Edit INV-001"');
    expect(html).toContain('aria-label="Delete INV-001"');
  });

  it("keeps automatic invoice income linked without manual mutation controls", () => {
    const html = renderRecords("income", [{ id: "income", invoiceId: "invoice", source: "Invoice INV-001", date: "2026-06-01", amountCents: 10000 }]);
    expect(html).toContain('href="/invoices/invoice/print"');
    expect(html).not.toContain('aria-label="Edit ');
    expect(html).not.toContain('aria-label="Delete ');
  });
});

it("keeps every report category and its amounts labelled in the semantic table", () => {
  const summary = buildTaxSummary({ year: 2026, asOf: "2026-06-01", profile: { name: "Test", email: "test@example.test", filingStatus: "SINGLE", priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false }, income: [{ date: "2026-06-01", amountCents: 500000 }], expenses: [{ date: "2026-06-01", category: "COMPUTER_HARDWARE", amountCents: 123456, businessUsePercent: 100 }], payments: [] });
  resource.mockReturnValue({ data: { data: summary }, refresh: vi.fn() });
  const html = renderToStaticMarkup(createElement(ReportsPage));
  const table = html.match(/<table[^>]*aria-label="Expenses by category"[\s\S]*?<\/table>/)![0];
  expect(table).toContain('role="table"');
  expect((table.match(/data-label="Category"/g) ?? []).length).toBe(summary.groups.length);
  for (const label of ["Schedule C line", "Entries", "Expenses", "Deductible"]) {
    expect((table.match(new RegExp(`data-label="${label}"`, "g")) ?? []).length).toBe(summary.groups.length);
  }
  expect(table).toContain("$1,234.56");
});
