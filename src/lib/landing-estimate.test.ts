import { describe, expect, it } from "vitest";
import { calculateLandingEstimate, formatUSD, FILING_STATUS_OPTIONS } from "./landing-estimate";

describe("landing estimate calculator", () => {
  it("provides valid filing status options", () => {
    expect(FILING_STATUS_OPTIONS.map(o => o.value)).toEqual(["SINGLE", "MARRIED_FILING_JOINTLY", "HEAD_OF_HOUSEHOLD"]);
  });

  it("calculates accurate 2026 federal tax estimate for standard single freelancer ($100k income, $15k deductions)", () => {
    const result = calculateLandingEstimate({
      incomeDollars: 100000,
      deductionsDollars: 15000,
      filingStatus: "SINGLE",
    });

    expect(result.netProfitCents).toBe(8500000);
    // Self-employment tax should be positive
    expect(result.seTaxCents).toBeGreaterThan(0);
    // Income tax should be positive
    expect(result.incomeTaxCents).toBeGreaterThan(0);
    // Total should equal SE tax + income tax
    expect(result.totalTaxCents).toBe(result.seTaxCents + result.incomeTaxCents);
    // Quarterly payment should be even total / 4 (rounded to cents)
    expect(result.quarterlyPaymentCents).toBe(Math.round(result.totalTaxCents / 4));
    // Formatted strings should have currency symbols and comma separators
    expect(result.formattedTotalTax).toMatch(/^\$[\d,]+$/);
    expect(result.formattedQuarterlyPayment).toMatch(/^\$[\d,]+$/);
  });

  it("handles zero deductions correctly ($50k income, $0 deductions)", () => {
    const result = calculateLandingEstimate({
      incomeDollars: 50000,
      deductionsDollars: 0,
      filingStatus: "SINGLE",
    });

    expect(result.netProfitCents).toBe(5000000);
    expect(result.totalTaxCents).toBeGreaterThan(0);
    expect(result.quarterlyPaymentCents).toBe(Math.round(result.totalTaxCents / 4));
  });

  it("handles deductions equal to or exceeding income by producing zero liability", () => {
    const resultEqual = calculateLandingEstimate({
      incomeDollars: 40000,
      deductionsDollars: 40000,
      filingStatus: "SINGLE",
    });
    expect(resultEqual.netProfitCents).toBe(0);
    expect(resultEqual.seTaxCents).toBe(0);
    expect(resultEqual.incomeTaxCents).toBe(0);
    expect(resultEqual.totalTaxCents).toBe(0);
    expect(resultEqual.quarterlyPaymentCents).toBe(0);
    expect(resultEqual.formattedTotalTax).toBe("$0");

    const resultExceed = calculateLandingEstimate({
      incomeDollars: 30000,
      deductionsDollars: 50000,
      filingStatus: "SINGLE",
    });
    expect(resultExceed.totalTaxCents).toBe(0);
    expect(resultExceed.quarterlyPaymentCents).toBe(0);
  });

  it("reflects lower tax liability for married filing jointly due to higher brackets and standard deduction", () => {
    const single = calculateLandingEstimate({
      incomeDollars: 120000,
      deductionsDollars: 20000,
      filingStatus: "SINGLE",
    });

    const mfj = calculateLandingEstimate({
      incomeDollars: 120000,
      deductionsDollars: 20000,
      filingStatus: "MARRIED_FILING_JOINTLY",
    });

    // SE tax is the same for the business owner
    expect(single.seTaxCents).toBe(mfj.seTaxCents);
    // But federal income tax should be lower for MFJ due to wider brackets and $32,200 standard deduction
    expect(mfj.incomeTaxCents).toBeLessThan(single.incomeTaxCents);
    expect(mfj.totalTaxCents).toBeLessThan(single.totalTaxCents);
  });

  it("supports boundary slider ranges ($10k min income up to $250k max income, $80k deductions)", () => {
    const minRange = calculateLandingEstimate({
      incomeDollars: 10000,
      deductionsDollars: 0,
      filingStatus: "SINGLE",
    });
    expect(minRange.totalTaxCents).toBeGreaterThan(0);

    const maxRange = calculateLandingEstimate({
      incomeDollars: 250000,
      deductionsDollars: 80000,
      filingStatus: "SINGLE",
    });
    expect(maxRange.totalTaxCents).toBeGreaterThan(minRange.totalTaxCents);
    expect(maxRange.quarterlyPaymentCents).toBe(Math.round(maxRange.totalTaxCents / 4));
  });

  it("formats USD currency values properly", () => {
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(100000)).toBe("$1,000");
    expect(formatUSD(1234567)).toBe("$12,346");
    expect(formatUSD(123456, 2)).toBe("$1,234.56");
    expect(formatUSD(-500)).toBe("$0");
  });
});
