import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCsv, ledgerCsv, parseCsv, previewExpenses } from "./csv";
beforeEach(() => vi.stubEnv("GEMINI_API_KEY", "")); afterEach(() => vi.unstubAllEnvs());
describe("CSV parsing and preview", () => {
  it("supports BOM, commas, quoted newlines, quotes and physical line numbers", () => {
    expect(parseCsv('\uFEFFdate,vendor,amount,notes\r\n2026-06-01,"A, B",1.20,"A ""quote""\nsecond line"\r\n\n2026-06-02,C,2.00,')).toEqual([
      { line: 1, cells: ["date", "vendor", "amount", "notes"] }, { line: 2, cells: ["2026-06-01", "A, B", "1.20", 'A "quote"\nsecond line'] }, { line: 5, cells: ["2026-06-02", "C", "2.00", ""] },
    ]);
  });
  it.each(['a,"unclosed', 'a,"closed"x', 'a,un"quoted'])("rejects malformed quoting %s", input => expect(() => parseCsv(input)).toThrow());
  it.each(["date,vendor,amount,amount\n2026-01-01,A,1,1", "date,vendor,total\n2026-01-01,A,1", "date,vendor,amount,userId\n2026-01-01,A,1,foreign", "date,vendor,amount", ""])("rejects invalid header or row count", async csv => { await expect(previewExpenses(csv)).rejects.toThrow(); });
  it("validates per row, suggests blank categories, and retains explicit choices", async () => {
    const result = await previewExpenses('date,vendor,amount,category,businessUsePercent,paymentMethod,notes\n2026-06-01,Adobe,29.99,,80,CREDIT_CARD,Design\n2026-02-30,Unknown,1.999,MEALS,101,WRONG,Notes\n2026-06-02,Uber,10.00,OFFICE_EXPENSE,,,');
    expect(result[0]).toMatchObject({ line: 2, errors: [], data: { amountCents: 2999, category: "SOFTWARE_AND_SUBSCRIPTIONS", businessUsePercent: 80 }, suggestion: { source: "rules" } });
    expect(result[1].errors.length).toBeGreaterThanOrEqual(4);
    expect(result[2]).toMatchObject({ errors: [], data: { category: "OFFICE_EXPENSE", businessUsePercent: 100, paymentMethod: "OTHER" } }); expect(result[2].suggestion).toBeUndefined();
  });
  it("rejects excess rows and reports unequal columns without writing", async () => {
    await expect(previewExpenses("date,vendor,amount\n" + "2026-01-01,A,1\n".repeat(51))).rejects.toThrow("50");
    const rows = await previewExpenses("date,vendor,amount\n2026-01-01,A,1,extra"); expect(rows[0].errors).toContain("Column count does not match the header.");
  });
});
describe("CSV export", () => {
  it("escapes formulas, commas, quotes and line breaks", () => {
    const result = encodeCsv([["=SUM(1)", " +cmd", "@lookup", "-1", "normal", 'a,"b"\nc', null]]);
    expect(parseCsv(result)[0].cells).toEqual(["'=SUM(1)", "' +cmd", "'@lookup", "'-1", "normal", 'a,"b"\nc', ""]);
  });
  it("exports integer cents exactly and roundtrips non-formula expenses", async () => {
    const csv = ledgerCsv("expenses", [{ date: new Date("2026-01-01"), vendor: "Adobe", amountCents: 101, category: "MEALS", businessUsePercent: 75, paymentMethod: "CASH", notes: "a,b" }]);
    expect((await previewExpenses(csv))[0]).toMatchObject({ errors: [], data: { amountCents: 101, notes: "a,b", category: "MEALS" } });
    expect(ledgerCsv("income", [{ date: new Date("2026-01-01"), source: "Client", amountCents: 2147483647, notes: null }])).toContain('"21474836.47"');
  });
});
