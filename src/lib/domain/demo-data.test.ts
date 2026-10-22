import { describe, expect, it } from "vitest";
import { demoClients, demoExpenses, demoInvoices, demoManualIncome, demoPayments } from "../../../prisma/demo-data";
import { annualEstimate, categories, deductibleAmount, quarterlyPresentation, quarterlySchedule, rules2026 } from "@/lib/tax";

describe("midterm demo ledger", () => {
  it("has a consistent paid ledger, unique invoice numbers and each requested status", () => {
    expect(demoClients).toHaveLength(4);
    expect(new Set(demoInvoices.map(i => i.number)).size).toBe(16);
    const paid = demoInvoices.filter(i => i.status === "PAID");
    expect(paid).toHaveLength(12);
    expect(new Set(paid.map(i => i.paidAt!.getUTCMonth())).size).toBe(10);
    expect(paid.reduce((sum, i) => sum + i.totalCents, 0)).toBe(7950000);
    for (const invoice of demoInvoices) {
      expect(invoice.clientIndex).toBeLessThan(demoClients.length);
      expect(invoice.dueDate >= invoice.issueDate).toBe(true);
      expect(invoice.status === "PAID").toBe(invoice.paidAt !== null);
      if (invoice.paidAt) expect(invoice.paidAt >= invoice.issueDate).toBe(true);
    }
    expect(demoInvoices.filter(i => i.status === "SENT")).toHaveLength(2);
    expect(demoInvoices.filter(i => i.status === "SENT" && i.dueDate < new Date("2026-10-22"))).toHaveLength(1);
    expect(demoInvoices.filter(i => i.status === "DRAFT")).toHaveLength(1);
    expect(demoInvoices.filter(i => i.status === "VOID")).toHaveLength(1);
  });
  it("covers the categories and matches all receipt totals/dates", () => {
    expect(demoExpenses).toHaveLength(48);
    expect(new Set(demoExpenses.map(e => e.category))).toEqual(new Set(Object.keys(categories)));
    expect(new Set(demoExpenses.map(e => e.date.getUTCMonth())).size).toBe(10);
    const receipts = demoExpenses.filter(e => e.sample);
    expect(receipts.map(e => [e.sample, e.amountCents, e.date.toISOString().slice(0, 10)])).toEqual([
      ["internet.png", 8000, "2026-06-15"], ["meals.png", 6200, "2026-06-10"], ["hardware.png", 31104, "2026-06-16"],
    ]);
    expect(deductibleAmount(receipts[0].amountCents, receipts[0].businessUsePercent, receipts[0].category)).toBe(6000);
    expect(deductibleAmount(receipts[1].amountCents, receipts[1].businessUsePercent, receipts[1].category)).toBe(3100);
  });
  it("produces a meaningful safe-harbour plan with Q3 slightly short", () => {
    const incomeCents = demoInvoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.totalCents, 0) + demoManualIncome.reduce((sum, i) => sum + i.amountCents, 0);
    expect(incomeCents).toBe(8248000);
    const deductionsCents = demoExpenses.reduce((sum, e) => sum + deductibleAmount(e.amountCents, e.businessUsePercent, e.category), 0);
    const asOf = "2026-10-22";
    const estimate = annualEstimate({ incomeCents, deductionsCents, filingStatus: "SINGLE", asOf }, rules2026);
    const schedule = quarterlySchedule({ totalTaxCents: estimate.totalTaxCents, priorYearTaxCents: 1600000, priorYearAgiCents: 7800000, useSafeHarbour: true, asOf, payments: demoPayments.map(p => ({ ...p, date: p.date.toISOString().slice(0, 10) })) }, rules2026);
    expect(schedule.method).toBe("SAFE_HARBOUR");
    const plan = quarterlyPresentation(schedule, asOf);
    expect(plan.quarters.map(q => q.status)).toEqual(["PAID", "PAID", "PAST_DUE", "UPCOMING"]);
    expect(plan.quarters[2].currentShortfallCents).toBe(15000);
    expect(plan).toMatchObject({ nextDueCents: 415000, remainingCents: 415000 });
  });
});
