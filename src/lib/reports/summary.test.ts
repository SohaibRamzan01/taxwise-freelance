import { describe, expect, it } from "vitest";
import { buildTaxSummary, deductionSummaryCsv, reportPeriod, type ReportExpense, type ReportIncome, type ReportPayment } from "./summary";
export const reportFixture = {
  year: 2026, asOf: "2027-01-20", profile: { name: "Alex", email: "alex@example.test", businessName: "Alex Studio", filingStatus: "SINGLE" as const, priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false },
  income: [{ date: "2026-03-31", amountCents: 10000000 }, { date: "2026-04-01", amountCents: 2000000 }, { date: "2027-01-01", amountCents: 999999 }] as ReportIncome[],
  expenses: [{ date: "2026-03-31", amountCents: 10001, category: "MEALS", businessUsePercent: 75 }, { date: "2026-04-01", amountCents: 100000, category: "COMPUTER_HARDWARE", businessUsePercent: 80 }, { date: "2026-04-02", amountCents: 10000, category: "INTERNET_PHONE", businessUsePercent: 75 }] as ReportExpense[],
  payments: [{ taxYear: 2026, quarter: 1, date: "2026-04-15", amountCents: 500000 }, { taxYear: 2026, quarter: 4, date: "2027-01-15", amountCents: 20000 }, { taxYear: 2027, quarter: 1, date: "2027-01-15", amountCents: 999999 }] as ReportPayment[],
};
describe("pure tax report summary", () => {
  it("groups all categories, applies meals/business use rounding and reuses the engine", () => {
    const s = buildTaxSummary(reportFixture);
    expect(s.incomeCents).toBe(12000000); expect(s.expenseCents).toBe(120001); expect(s.deductionsCents).toBe(91250); expect(s.netProfitCents).toBe(11908750);
    expect(s.groups.find(g => g.category === "MEALS")).toMatchObject({ count: 1, expenseCents: 10001, deductibleCents: 3750, scheduleC: "24b" });
    expect(s.estimate.annualised).toBe(false); expect(s.estimate.netProfitCents).toBe(s.netProfitCents); expect(s.estimate.se.totalCents).toBeGreaterThan(0); expect(s.estimate.qbi.deductionCents).toBeGreaterThan(0);
    expect(s.estimate.totalTaxCents).toBe(s.estimate.se.totalCents + s.estimate.federal.totalCents);
    expect(s.paymentsCents).toBe(520000); expect(s.schedule.paidSoFarCents).toBe(520000); expect(s.schedule.estimatedBalanceCents).toBe(s.estimate.totalTaxCents - 520000);
    expect(s.schedule.quarters.map(q => q.dueDate)).toEqual(["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"]);
  });
  it("uses calendar quarters with exclusive next-quarter boundaries and full-year YTD payment planning", () => {
    const q1 = buildTaxSummary({ ...reportFixture, quarter: 1 }), q2 = buildTaxSummary({ ...reportFixture, quarter: 2 });
    expect(q1.incomeCents).toBe(10000000); expect(q2.incomeCents).toBe(2000000); expect(q2.deductionsCents).toBe(87500); expect(q2.paymentsCents).toBe(0);
    expect(q1.paymentsCents).toBe(500000); expect(q2.schedule).toEqual(q1.schedule); expect(q1.ytdEstimate.totalTaxCents).toBe(buildTaxSummary(reportFixture).estimate.totalTaxCents);
    expect(q1.calculationNote).toContain("not a quarterly filing liability");
  });
  it("excludes future entries/payments, supports zero activity, losses and safe harbour", () => {
    const s = buildTaxSummary({ ...reportFixture, asOf: "2026-03-31" }); expect(s.incomeCents).toBe(10000000); expect(s.paymentsCents).toBe(0);
    const empty = buildTaxSummary({ ...reportFixture, income: [], expenses: [], payments: [] }); expect(empty.estimate.totalTaxCents).toBe(0); expect(empty.groups.every(g => !g.count)).toBe(true);
    expect(buildTaxSummary({ ...reportFixture, income: [] }).estimate.totalTaxCents).toBe(0);
    const safe = buildTaxSummary({ ...reportFixture, profile: { ...reportFixture.profile, useSafeHarbour: true, priorYearTaxCents: 100000, priorYearAgiCents: 16000000 } }); expect(safe.schedule.requiredAnnualCents).toBe(110000); expect(safe.schedule.remainingCents).toBe(0);
  });
  it("validates periods and inputs and never mutates source data", () => {
    expect(reportPeriod(2026, 4)).toMatchObject({ from: "2026-10-01", to: "2026-12-31" });
    for (const quarter of [0, 5, 1.5]) expect(() => reportPeriod(2026, quarter)).toThrow();
    expect(() => reportPeriod(1999)).toThrow(); expect(() => buildTaxSummary({ ...reportFixture, year: 2025 })).toThrow();
    expect(() => buildTaxSummary({ ...reportFixture, asOf: "2025-12-31" })).toThrow();
    expect(() => buildTaxSummary({ ...reportFixture, income: [{ date: "bad", amountCents: 1 }] })).toThrow();
    const original = structuredClone(reportFixture); buildTaxSummary(reportFixture); expect(reportFixture).toEqual(original);
  });
  it("exports the same deduction rows and totals as CSV", () => {
    const summary = buildTaxSummary(reportFixture), csv = deductionSummaryCsv(summary);
    expect(csv).toContain('"Meals","24b","1","100.01","37.50"'); expect(csv).toContain('"TOTAL","","3","1200.01","912.50"');
    expect(csv.split("\r\n").length).toBe(summary.groups.length + 3);
    expect(deductionSummaryCsv(buildTaxSummary({ ...reportFixture, quarter: 2 }))).toContain('"2026","2"');
  });
});
