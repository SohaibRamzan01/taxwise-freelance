import { describe, expect, it } from "vitest";
import { annualEstimate, deductibleAmount, federalIncomeTax, isoDate, qualifiedBusinessIncome, quarterlySchedule, quarterlyPresentation, roundedRatio, rules2026 as rules, selfEmploymentTax, type FilingStatus } from ".";

describe("integer-cent deductions and rounding", () => {
  it("applies business use and the meals factor, rounding only the final result", () => {
    expect(deductibleAmount(10000, 75, "UTILITIES")).toBe(7500);
    expect(deductibleAmount(10000, 75, "MEALS")).toBe(3750);
    expect(deductibleAmount(101, 50, "MEALS")).toBe(25);
    expect(deductibleAmount(1, 100, "MEALS")).toBe(1);
    expect(deductibleAmount(12345, 0, "OTHER")).toBe(0);
    expect(roundedRatio(9007199254740991, 1, 1)).toBe(9007199254740991);
  });
  it("rejects invalid money, percentages, dates and unsafe arithmetic", () => {
    for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => deductibleAmount(value, 100, "OTHER")).toThrow();
    for (const percent of [-1, 101, 10.5]) expect(() => deductibleAmount(100, percent, "MEALS")).toThrow();
    expect(() => roundedRatio(100, 1, 0)).toThrow();
    expect(() => roundedRatio(Number.MAX_SAFE_INTEGER, 2, 1)).toThrow();
    for (const date of ["2026-02-29", "2026-13-01", "bad"]) expect(() => isoDate(date)).toThrow();
    expect(isoDate("2024-02-29").getUTCDate()).toBe(29);
  });
});
describe("current quarterly presentation", () => {
  const input = { totalTaxCents: 50169, priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false, asOf: "2026-10-22", payments: [{ quarter: 2, date: "2026-06-15", amountCents: 45000 }] };
  it("clears historical shortfalls covered by a later allocated payment", () => {
    const schedule = quarterlySchedule(input, rules);
    const plan = quarterlyPresentation(schedule, input.asOf);
    expect(schedule.quarters[0].remainingCents).toBe(12542); // Preserve allocation history.
    expect(plan.quarters.map(q => q.status)).toEqual(["COVERED_LATER", "PAID", "PAID", "UPCOMING"]);
    expect(plan.quarters.slice(0, 3).map(q => q.currentShortfallCents)).toEqual([0, 0, 0]);
    expect(plan).toMatchObject({ nextDueDate: "2027-01-15", nextDueCents: 5169, remainingCents: 5169 });
  });
  it("shows only the remaining current cumulative deficit as past due", () => {
    const plan = quarterlyPresentation(quarterlySchedule({ ...input, payments: [{ quarter: 2, date: "2026-06-15", amountCents: 15000 }] }, rules), input.asOf);
    expect(plan.quarters.map(q => q.status)).toEqual(["COVERED_LATER", "PAST_DUE", "PAST_DUE", "UPCOMING"]);
    expect(plan.quarters.map(q => q.currentShortfallCents)).toEqual([0, 10084, 22626, 35169]);
  });
  it("handles early overpayments, zero tax, safe harbour and dates after the last deadline", () => {
    const overpaid = quarterlyPresentation(quarterlySchedule({ ...input, payments: [{ quarter: 1, date: "2026-04-01", amountCents: 60000 }] }, rules), input.asOf);
    expect(overpaid.quarters.every(q => q.status === "PAID")).toBe(true);
    expect(overpaid.nextDueCents).toBe(0);
    const zero = quarterlyPresentation(quarterlySchedule({ ...input, useSafeHarbour: true }, rules), input.asOf);
    expect(zero.quarters.every(q => q.status === "PAID")).toBe(true);
    const ended = quarterlyPresentation(quarterlySchedule({ ...input, asOf: "2027-01-16" }, rules), "2027-01-16");
    expect(ended).toMatchObject({ nextDueDate: null, nextDueCents: 0, remainingCents: 5169 });
    expect(ended.quarters[3]).toMatchObject({ status: "PAST_DUE", currentShortfallCents: 5169 });
  });
  it("excludes future payments and treats the deadline itself as upcoming", () => {
    const asOf = "2026-06-15";
    const plan = quarterlyPresentation(quarterlySchedule({ ...input, asOf, payments: [{ quarter: 2, date: "2026-06-16", amountCents: 45000 }] }, rules), asOf);
    expect(plan.quarters.map(q => q.status)).toEqual(["PAST_DUE", "UPCOMING", "UPCOMING", "UPCOMING"]);
    expect(plan).toMatchObject({ nextDueDate: asOf, nextDueCents: 25084, remainingCents: 50169 });
  });
});
describe("self-employment tax", () => {
  it("hand-checks $100,000 profit: $92,350 earnings × 15.3%", () => {
    expect(selfEmploymentTax(10000000, "SINGLE", rules)).toEqual({ netEarningsCents: 9235000, socialSecurityCents: 1145140, medicareCents: 267815, additionalMedicareCents: 0, baseTaxCents: 1412955, totalCents: 1412955, halfDeductionCents: 706478 });
  });
  it.each(["SINGLE", "HEAD_OF_HOUSEHOLD", "MARRIED_FILING_JOINTLY"] as FilingStatus[])("caps SS and excludes additional Medicare from the half deduction (%s)", status => {
    const result = selfEmploymentTax(30000000, status, rules);
    expect(result.netEarningsCents).toBe(27705000);
    expect(result.socialSecurityCents).toBe(2287800); // $184,500 × 12.4%
    expect(result.medicareCents).toBe(803445); // $277,050 × 2.9%
    expect(result.additionalMedicareCents).toBe(status === "MARRIED_FILING_JOINTLY" ? 24345 : 69345);
    expect(result.halfDeductionCents).toBe(1545623);
  });
  it("has no tax on zero or losses, and supports alternative rule objects", () => {
    expect(selfEmploymentTax(-10000, "SINGLE", rules).totalCents).toBe(0);
    expect(selfEmploymentTax(0, "SINGLE", rules).totalCents).toBe(0);
    expect(() => selfEmploymentTax(0.5, "SINGLE", rules)).toThrow();
    const custom = { ...rules, netEarningsBasisPoints: 10000 };
    expect(selfEmploymentTax(18450000, "SINGLE", custom).socialSecurityCents).toBe(2287800);
    expect(selfEmploymentTax(18450100, "SINGLE", custom).socialSecurityCents).toBe(2287800);
    expect(selfEmploymentTax(20000000, "SINGLE", custom).additionalMedicareCents).toBe(0);
    expect(selfEmploymentTax(20010000, "SINGLE", custom).additionalMedicareCents).toBe(90);
  });
});
describe("progressive federal brackets", () => {
  // Hand sums at every finite bracket ceiling (in dollars).
  const cases: [FilingStatus, number[]][] = [
    ["SINGLE", [1240, 5800, 17966, 41024, 58448, 192979.25]],
    ["MARRIED_FILING_JOINTLY", [2480, 11600, 35932, 82048, 116896, 206583.5]],
    ["HEAD_OF_HOUSEHOLD", [1770, 7740, 16155, 39207, 56631, 191171]],
  ];
  for (const [status, taxes] of cases) {
    it.each(taxes.map((tax, i) => [i, tax]))(`${status} ceiling %i`, (i, tax) => {
      const ceiling = rules.brackets[status][i].upToCents!;
      expect(federalIncomeTax(ceiling, status, rules).totalCents).toBe(Math.round(tax * 100));
      expect(federalIncomeTax(ceiling + 10000, status, rules).totalCents).toBe(Math.round(tax * 100) + rules.brackets[status][i + 1].rateBasisPoints);
    });
    it(`${status} starts at zero`, () => expect(federalIncomeTax(0, status, rules).totalCents).toBe(0));
  }
});
describe("QBI and annual estimates", () => {
  it("limits QBI to 20% of taxable income before QBI", () => {
    expect(qualifiedBusinessIncome(10000000, 706478, 7683522, rules)).toEqual({ qualifiedIncomeCents: 9293522, businessLimitCents: 1858704, taxableLimitCents: 1536704, deductionCents: 1536704 });
    expect(qualifiedBusinessIncome(-10000, 0, 0, rules).deductionCents).toBe(0);
    expect(qualifiedBusinessIncome(10000, 0, 100000, rules).deductionCents).toBe(2000);
  });
  it("hand-checks a full single estimate on $100,000 net profit", () => {
    const result = annualEstimate({ incomeCents: 12000000, deductionsCents: 2000000, filingStatus: "SINGLE", asOf: "2026-12-31" }, rules);
    expect(result.netProfitCents).toBe(10000000);
    expect(result.standardDeductionCents).toBe(1610000);
    expect(result.qbi.deductionCents).toBe(1536704);
    expect(result.federal.taxableIncomeCents).toBe(6146818);
    expect(result.federal.totalCents).toBe(823500);
    expect(result.totalTaxCents).toBe(2236455);
  });
  it("annualises by inclusive UTC calendar days and allows actual YTD", () => {
    const input = { incomeCents: 1820000, deductionsCents: 182000, filingStatus: "SINGLE" as const, asOf: "2026-07-01" };
    expect(annualEstimate(input, rules)).toMatchObject({ elapsedDays: 182, yearDays: 365, incomeCents: 3650000, deductionsCents: 365000 });
    expect(annualEstimate({ ...input, annualise: false }, rules).incomeCents).toBe(1820000);
    expect(annualEstimate({ ...input, asOf: "2027-01-15" }, rules).incomeCents).toBe(1820000);
    expect(annualEstimate({ ...input, asOf: "2026-01-01" }, rules).incomeCents).toBe(664300000);
    expect(() => annualEstimate({ ...input, asOf: "2025-12-31" }, rules)).toThrow();
  });
  it.each(["SINGLE", "HEAD_OF_HOUSEHOLD", "MARRIED_FILING_JOINTLY"] as FilingStatus[])("floors negative taxable income (%s)", filingStatus => {
    expect(annualEstimate({ incomeCents: 0, deductionsCents: 10000, filingStatus, asOf: "2026-12-31" }, rules).totalTaxCents).toBe(0);
  });
});
describe("quarterly schedule", () => {
  const input = { totalTaxCents: 1000001, priorYearTaxCents: 800000, priorYearAgiCents: 15000000, useSafeHarbour: true, asOf: "2026-06-15", payments: [{ quarter: 1, date: "2026-04-15", amountCents: 210000 }] };
  it("uses lower prior-year tax at 100%, then 110% strictly above $150k", () => {
    const schedule = quarterlySchedule(input, rules);
    expect(schedule).toMatchObject({ method: "SAFE_HARBOUR", requiredAnnualCents: 800000, paidSoFarCents: 210000, remainingCents: 590000, estimatedBalanceCents: 790001, nextDueDate: "2026-06-15" });
    expect(schedule.quarters.map(q => q.requiredCents)).toEqual([200000, 200000, 200000, 200000]);
    expect(schedule.quarters[1].remainingCents).toBe(190000);
    expect(quarterlySchedule({ ...input, priorYearAgiCents: 15000001 }, rules).requiredAnnualCents).toBe(880000);
    expect(quarterlySchedule({ ...input, priorYearTaxCents: 2000000 }, rules).method).toBe("REGULAR");
  });
  it("allocates every penny, carries prior overpayments, excludes future payments", () => {
    const schedule = quarterlySchedule({ ...input, useSafeHarbour: false, payments: [{ quarter: 1, date: "2026-04-01", amountCents: 400000 }, { quarter: 2, date: "2026-06-16", amountCents: 900000 }] }, rules);
    expect(schedule.quarters.map(q => q.requiredCents)).toEqual([250000, 250000, 250000, 250001]);
    expect(schedule.quarters[1].remainingCents).toBe(100000);
    expect(schedule.paidSoFarCents).toBe(400000);
    expect(schedule.quarters.map(q => q.dueDate)).toEqual(rules.dueDates);
  });
  it("floors balances and marks unpaid past due dates", () => {
    expect(quarterlySchedule({ ...input, payments: [], asOf: "2027-01-16" }, rules)).toMatchObject({ nextDueDate: null, quarters: expect.arrayContaining([expect.objectContaining({ overdue: true })]) });
    expect(quarterlySchedule({ ...input, payments: [{ quarter: 1, date: "2026-04-01", amountCents: 2000000 }] }, rules).remainingCents).toBe(0);
    expect(quarterlySchedule({ ...input, priorYearTaxCents: 0 }, rules).requiredAnnualCents).toBe(0);
    expect(() => quarterlySchedule({ ...input, payments: [{ quarter: 5, date: "2026-04-01", amountCents: 1 }] }, rules)).toThrow();
  });
});
