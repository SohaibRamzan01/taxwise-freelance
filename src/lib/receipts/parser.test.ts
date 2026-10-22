import { describe, expect, it } from "vitest";
import { parseReceiptText } from "./parser";
describe("receipt parser", () => {
  it("prefers grand total over subtotal, tendered cash and change", () => {
    expect(parseReceiptText("DELL\nReceipt\nDate: 2026-06-16\nMonitor $249.00\nSUBTOTAL $249.00\nTax $19.92\nGRAND TOTAL $268.92\nCASH $300.00\nCHANGE $31.08")).toMatchObject({ vendor: "DELL", date: "2026-06-16", totalCents: 26892, suggestion: { category: "COMPUTER_HARDWARE" } });
  });
  it("parses a bill with amount due and a US date", () => {
    expect(parseReceiptText("PTCL\nDate 06/15/2026\nPrevious balance 120.00\nAMOUNT DUE\n$80.00")).toMatchObject({ vendor: "PTCL", date: "2026-06-15", totalCents: 8000, suggestion: { category: "INTERNET_PHONE" } });
  });
  it("parses meals, named dates, decimal commas and messy OCR digits", () => {
    const raw = "\nRECEIPT\nCEDAR CAFE\nJune 10, 2026\nLunch 42,00\nCoffee 8,00\nSUB TOTAL 50,00\nT0TAL 62.OO\nThank you";
    expect(parseReceiptText(raw)).toMatchObject({ vendor: "CEDAR CAFE", date: "2026-06-10", totalCents: 6200, rawText: raw, suggestion: { category: "MEALS" } });
  });
  it.each(["16/06/2026", "06-16-26", "16 Jun 2026", "2026.06.16"])("parses %s", date => expect(parseReceiptText(`Uber\n${date}\nTOTAL 12.34`).date).toBe("2026-06-16"));
  it("uses the largest monetary amount as fallback, excluding dates/order numbers", () => {
    expect(parseReceiptText("Shop\nOrder 9988776655\n2026-06-16\nItem 1,234.56\nItem 99.50").totalCents).toBe(123456);
  });
  it("does not treat subtotal as total or total items/savings as the bill", () => {
    expect(parseReceiptText("Shop\nSUBTOTAL 200.00\nTOTAL 190.00\nTOTAL SAVINGS 210.00").totalCents).toBe(19000);
    expect(parseReceiptText("Shop\nItem 9.99\nSUBTOTAL 100.00").totalCents).toBe(10000);
  });
  it("keeps merchant names starting with header-like words and skips total-only text", () => {
    expect(parseReceiptText("Telecom Store\nTOTAL 12.34").vendor).toBe("Telecom Store");
    expect(parseReceiptText("TOTAL 12.34").vendor).toBeNull();
  });
  it("handles missing fields, invalid dates, oversized money, and vendor length safely", () => {
    expect(parseReceiptText("")).toMatchObject({ vendor: null, date: null, totalCents: null, rawText: "", suggestion: { category: "OTHER" } });
    expect(parseReceiptText("Shop\n2026-02-30\nTOTAL 999999999.00")).toMatchObject({ date: null, totalCents: null });
    expect(parseReceiptText("Shop\n99/99/2026").date).toBeNull();
    expect(parseReceiptText("Shop\nFoo 12 2026").date).toBeNull();
    expect(parseReceiptText("A".repeat(300)).vendor).toHaveLength(200);
  });
  it("rejects very long numeric OCR tokens while retaining valid grouped totals", () => {
    expect(parseReceiptText(`Shop\nTOTAL ${"9".repeat(100000)}.00`).totalCents).toBeNull();
    expect(parseReceiptText("Shop\nTOTAL $21,474,836.47").totalCents).toBe(2147483647);
    expect(parseReceiptText("Shop\nTOTAL 1 234.56").totalCents).toBe(123456);
  });
});
