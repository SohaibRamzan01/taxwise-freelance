import { describe, expect, it } from "vitest";
import { clientSchema, estimateQuerySchema, expenseSchema, expensePatchSchema, incomeSchema, invoicePatchSchema, invoiceSchema, listSchema, paymentSchema, settingsSchema } from "./validation";
import { assertTransition, effectiveStatus, invoiceTotals } from "./invoices";
import { dollarsToCents, formatMoney, moneyText } from "@/lib/money";
const expense = { date: "2026-01-01", vendor: "Shop", amountCents: 100, category: "MEALS" };
const invoice = { clientId: "client", issueDate: "2026-01-01", dueDate: "2026-01-15", items: [{ description: "Design", quantity: 2.5, unitPriceCents: 10000 }], discountCents: 1000, taxRateBasisPoints: 725 };
describe("domain validation", () => {
  it("validates dates, cents, percentages, allowed enums, bounded pagination and strict ownership", () => {
    expect(expenseSchema.parse(expense)).toMatchObject({ businessUsePercent: 100, paymentMethod: "OTHER", date: new Date("2026-01-01") });
    for (const patch of [{ amountCents: 0.5 }, { amountCents: -1 }, { amountCents: 2147483648 }, { date: "2026-02-30" }, { businessUsePercent: 101 }, { userId: "attacker" }, { category: "INVALID" }]) expect(expenseSchema.safeParse({ ...expense, ...patch }).success).toBe(false);
    expect(listSchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    for (const q of [{ pageSize: 101 }, { page: 0 }, { direction: "sideways" }, { from: "2026-02-01", to: "2026-01-01" }, { quarter: 5 }]) expect(listSchema.safeParse(q).success).toBe(false);
    expect(incomeSchema.safeParse({ date: "2026-01-01", source: "X", amountCents: 1, invoiceId: "x" }).success).toBe(false);
    expect(clientSchema.safeParse({ name: "X", email: "bad" }).success).toBe(false);
    expect(clientSchema.parse({ name: " X ", email: "" }).name).toBe("X");
    expect(paymentSchema.safeParse({ taxYear: 2025, quarter: 1, date: "2026-01-01", amountCents: 0 }).success).toBe(false);
    expect(settingsSchema.safeParse({ role: "ADMIN" }).success).toBe(false);
    expect(settingsSchema.safeParse({ currency: "EUR" }).success).toBe(false);
    expect(estimateQuerySchema.safeParse({ year: "2025" }).success).toBe(false);
    expect(estimateQuerySchema.parse({ year: "2026", annualise: "false" }).year).toBe(2026);
  });
  it("validates invoice items and does not trust submitted totals", () => {
    expect(invoiceSchema.parse(invoice).items[0].quantity).toBe(2.5);
    for (const quantity of [0, -1, 0.12345, 1000001]) expect(invoiceSchema.safeParse({ ...invoice, items: [{ ...invoice.items[0], quantity }] }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...invoice, totalCents: 1 }).success).toBe(false);
    expect(invoicePatchSchema.parse({ status: "PAID", paidAt: "2026-01-10" }).status).toBe("PAID");
    expect(invoicePatchSchema.parse({ status: "SENT" })).toEqual({ status: "SENT" });
    expect(expensePatchSchema.parse({ vendor: "Renamed" })).toEqual({ vendor: "Renamed" });
  });
});
describe("invoice business rules", () => {
  it("rounds each line and taxes the discounted subtotal", () => {
    expect(invoiceTotals(invoice)).toMatchObject({ subtotalCents: 25000, taxCents: 1740, totalCents: 25740, items: [expect.objectContaining({ amountCents: 25000, position: 0 })] });
    expect(invoiceTotals({ ...invoice, items: [{ description: "Half cent", quantity: 0.5, unitPriceCents: 1 }], discountCents: 0, taxRateBasisPoints: 0 }).totalCents).toBe(1);
    expect(() => invoiceTotals({ ...invoice, discountCents: 25001 })).toThrow("Discount");
    expect(() => invoiceTotals({ ...invoice, items: [{ description: "Huge", quantity: 100, unitPriceCents: 2147483647 }] })).toThrow("exceeds");
  });
  it("enforces transitions and computes overdue only on sent invoices", () => {
    for (const [from, to] of [["DRAFT", "SENT"], ["SENT", "PAID"], ["PAID", "SENT"], ["PAID", "VOID"], ["VOID", "DRAFT"], ["PAID", "PAID"]] as const) expect(() => assertTransition(from, to)).not.toThrow();
    for (const [from, to] of [["DRAFT", "PAID"], ["VOID", "PAID"], ["SENT", "OVERDUE"]] as const) expect(() => assertTransition(from, to)).toThrow();
    const dueDate = new Date("2026-06-15");
    expect(effectiveStatus({ status: "SENT", dueDate }, "2026-06-15")).toBe("SENT");
    expect(effectiveStatus({ status: "SENT", dueDate }, "2026-06-16")).toBe("OVERDUE");
    expect(effectiveStatus({ status: "DRAFT", dueDate }, "2026-06-16")).toBe("DRAFT");
    expect(effectiveStatus({ status: "OVERDUE", dueDate }, "2026-06-14")).toBe("SENT");
  });
  it("parses decimal dollars without losing a cent", () => {
    expect(dollarsToCents("123.45")).toBe(12345); expect(dollarsToCents("0.1")).toBe(10); expect(dollarsToCents("0")).toBe(0);
    for (const value of ["-1", "1.001", "NaN", "21474836.48", "1e5", ""]) expect(() => dollarsToCents(value)).toThrow();
    expect(moneyText(101)).toBe("1.01"); expect(formatMoney(100)).toBe("$1.00");
  });
});
