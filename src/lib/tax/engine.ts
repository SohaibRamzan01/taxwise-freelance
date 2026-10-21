import { categories, type ExpenseCategory } from "./categories";
import type { AnnualInput, FilingStatus, Payment, TaxRules } from "./types";

export function cents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("Money must be non-negative integer cents.");
  return value;
}

/** Exact integer multiplication, rounded half up once at the cent boundary. */
export function roundedRatio(value: number, numerator: number, denominator: number): number {
  cents(value); cents(numerator);
  if (!Number.isSafeInteger(denominator) || denominator <= 0) throw new RangeError("Invalid denominator.");
  const result = Number((BigInt(value) * BigInt(numerator) * 2n + BigInt(denominator)) / (2n * BigInt(denominator)));
  return cents(result);
}

export function deductibleAmount(amountCents: number, businessUsePercent: number, category: ExpenseCategory) {
  if (!Number.isInteger(businessUsePercent) || businessUsePercent < 0 || businessUsePercent > 100 || !categories[category]) throw new RangeError("Invalid expense deduction inputs.");
  return roundedRatio(amountCents, businessUsePercent * categories[category].factorBasisPoints, 1000000);
}

export function selfEmploymentTax(netProfitCents: number, filingStatus: FilingStatus, rules: TaxRules) {
  if (!Number.isSafeInteger(netProfitCents)) throw new RangeError("Profit must be integer cents.");
  const netEarningsCents = roundedRatio(Math.max(0, netProfitCents), rules.netEarningsBasisPoints, 10000);
  const socialSecurityCents = roundedRatio(Math.min(netEarningsCents, rules.socialSecurityWageBaseCents), rules.socialSecurityBasisPoints, 10000);
  const medicareCents = roundedRatio(netEarningsCents, rules.medicareBasisPoints, 10000);
  const additionalMedicareCents = roundedRatio(Math.max(0, netEarningsCents - rules.additionalMedicareThresholdCents[filingStatus]), rules.additionalMedicareBasisPoints, 10000);
  const baseTaxCents = socialSecurityCents + medicareCents;
  return { netEarningsCents, socialSecurityCents, medicareCents, additionalMedicareCents, baseTaxCents, totalCents: baseTaxCents + additionalMedicareCents, halfDeductionCents: roundedRatio(baseTaxCents, 1, 2) };
}

export function federalIncomeTax(taxableIncomeCents: number, filingStatus: FilingStatus, rules: TaxRules) {
  cents(taxableIncomeCents);
  let lowerCents = 0;
  const brackets = rules.brackets[filingStatus].map(bracket => {
    const taxableCents = Math.max(0, Math.min(taxableIncomeCents, bracket.upToCents ?? taxableIncomeCents) - lowerCents);
    const taxCents = roundedRatio(taxableCents, bracket.rateBasisPoints, 10000);
    const line = { lowerCents, ...bracket, taxableCents, taxCents };
    lowerCents = bracket.upToCents ?? taxableIncomeCents;
    return line;
  });
  return { taxableIncomeCents, brackets, totalCents: brackets.reduce((sum, b) => sum + b.taxCents, 0) };
}

export function qualifiedBusinessIncome(netProfitCents: number, halfSeDeductionCents: number, taxableBeforeQbiCents: number, rules: TaxRules) {
  if (!Number.isSafeInteger(netProfitCents)) throw new RangeError("Profit must be integer cents.");
  cents(halfSeDeductionCents); cents(taxableBeforeQbiCents);
  const qualifiedIncomeCents = Math.max(0, netProfitCents - halfSeDeductionCents);
  const businessLimitCents = roundedRatio(qualifiedIncomeCents, rules.qbiBasisPoints, 10000);
  const taxableLimitCents = roundedRatio(taxableBeforeQbiCents, rules.qbiBasisPoints, 10000);
  return { qualifiedIncomeCents, businessLimitCents, taxableLimitCents, deductionCents: Math.min(businessLimitCents, taxableLimitCents) };
}

export function isoDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError("Invalid ISO date.");
  return date;
}

export function annualEstimate(input: AnnualInput, rules: TaxRules) {
  cents(input.incomeCents); cents(input.deductionsCents);
  const asOf = isoDate(input.asOf).getTime();
  const start = Date.UTC(rules.year, 0, 1), end = Date.UTC(rules.year + 1, 0, 1);
  if (asOf < start) throw new RangeError("Cannot annualise a future tax year.");
  const yearDays = (end - start) / 86400000;
  const elapsedDays = Math.min(yearDays, (asOf - start) / 86400000 + 1);
  const annualised = input.annualise !== false;
  const incomeCents = annualised ? roundedRatio(input.incomeCents, yearDays, elapsedDays) : input.incomeCents;
  const deductionsCents = annualised ? roundedRatio(input.deductionsCents, yearDays, elapsedDays) : input.deductionsCents;
  const netProfitCents = incomeCents - deductionsCents;
  const se = selfEmploymentTax(netProfitCents, input.filingStatus, rules);
  const adjustedGrossIncomeCents = Math.max(0, netProfitCents - se.halfDeductionCents);
  const standardDeductionCents = rules.standardDeductionCents[input.filingStatus];
  const taxableBeforeQbiCents = Math.max(0, adjustedGrossIncomeCents - standardDeductionCents);
  const qbi = qualifiedBusinessIncome(netProfitCents, se.halfDeductionCents, taxableBeforeQbiCents, rules);
  const federal = federalIncomeTax(taxableBeforeQbiCents - qbi.deductionCents, input.filingStatus, rules);
  const totalTaxCents = cents(se.totalCents + federal.totalCents);
  return { jurisdiction: rules.jurisdiction, year: rules.year, filingStatus: input.filingStatus, asOf: input.asOf, annualised, elapsedDays, yearDays,
    ytdIncomeCents: input.incomeCents, ytdDeductionsCents: input.deductionsCents, incomeCents, deductionsCents, netProfitCents, se,
    adjustedGrossIncomeCents, standardDeductionCents, taxableBeforeQbiCents, qbi, federal, totalTaxCents };
}
export type AnnualEstimate = ReturnType<typeof annualEstimate>;

export interface ScheduleInput {
  totalTaxCents: number; priorYearTaxCents: number; priorYearAgiCents: number; useSafeHarbour: boolean;
  asOf: string; payments: Payment[];
}
export function quarterlySchedule(input: ScheduleInput, rules: TaxRules) {
  cents(input.totalTaxCents); cents(input.priorYearTaxCents); cents(input.priorYearAgiCents); isoDate(input.asOf);
  const safeHarbourBasisPoints = input.priorYearAgiCents > rules.safeHarbourAgiThresholdCents ? 11000 : 10000;
  const safeHarbourCents = roundedRatio(input.priorYearTaxCents, safeHarbourBasisPoints, 10000);
  // This planning model uses 100% of projected current-year liability for regular payments.
  const regularCents = input.totalTaxCents;
  const method = input.useSafeHarbour && safeHarbourCents < regularCents ? "SAFE_HARBOUR" : "REGULAR";
  const requiredAnnualCents = method === "SAFE_HARBOUR" ? safeHarbourCents : regularCents;
  for (const p of input.payments) { cents(p.amountCents); isoDate(p.date); if (!Number.isInteger(p.quarter) || p.quarter < 1 || p.quarter > 4) throw new RangeError("Invalid quarter."); }
  const payments = input.payments.filter(p => p.date <= input.asOf);
  const paidSoFarCents = cents(payments.reduce((sum, p) => sum + p.amountCents, 0));
  const quarters = rules.dueDates.map((dueDate, i) => {
    const cumulativeRequiredCents = Number(BigInt(requiredAnnualCents) * BigInt(i + 1) / 4n);
    const requiredCents = cumulativeRequiredCents - Number(BigInt(requiredAnnualCents) * BigInt(i) / 4n);
    const paidCents = payments.filter(p => p.quarter === i + 1).reduce((sum, p) => sum + p.amountCents, 0);
    const cumulativePaidCents = payments.filter(p => p.quarter <= i + 1).reduce((sum, p) => sum + p.amountCents, 0);
    return { quarter: i + 1, dueDate, requiredCents, cumulativeRequiredCents, paidCents, remainingCents: Math.max(0, cumulativeRequiredCents - cumulativePaidCents), overdue: dueDate < input.asOf && cumulativeRequiredCents > cumulativePaidCents };
  });
  const nextDueDate = quarters.find(q => q.dueDate >= input.asOf)?.dueDate ?? null;
  return { method, regularCents, safeHarbourCents, safeHarbourBasisPoints, requiredAnnualCents, paidSoFarCents,
    remainingCents: Math.max(0, requiredAnnualCents - paidSoFarCents), estimatedBalanceCents: Math.max(0, input.totalTaxCents - paidSoFarCents), nextDueDate, quarters };
}
export type QuarterlySchedule = ReturnType<typeof quarterlySchedule>;
