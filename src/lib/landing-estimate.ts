import { annualEstimate, rules2026, type FilingStatus } from "./tax";

export interface LandingEstimateInput {
  incomeDollars: number;
  deductionsDollars: number;
  filingStatus: FilingStatus;
}

export interface LandingEstimateResult {
  incomeDollars: number;
  deductionsDollars: number;
  filingStatus: FilingStatus;
  incomeCents: number;
  deductionsCents: number;
  netProfitCents: number;
  seTaxCents: number;
  incomeTaxCents: number;
  totalTaxCents: number;
  quarterlyPaymentCents: number;
  formattedSeTax: string;
  formattedIncomeTax: string;
  formattedTotalTax: string;
  formattedQuarterlyPayment: string;
}

export const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED_FILING_JOINTLY", label: "Married filing jointly" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of household" },
];

export function formatUSD(cents: number, fractionDigits = 0): string {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeCents / 100);
}

export function calculateLandingEstimate(input: LandingEstimateInput): LandingEstimateResult {
  const rawIncome = Number.isFinite(input.incomeDollars) ? Math.max(0, input.incomeDollars) : 0;
  const rawDeductions = Number.isFinite(input.deductionsDollars) ? Math.max(0, input.deductionsDollars) : 0;

  const incomeCents = Math.round(rawIncome * 100);
  const deductionsCents = Math.round(rawDeductions * 100);

  const estimate = annualEstimate(
    {
      incomeCents,
      deductionsCents,
      filingStatus: input.filingStatus,
      asOf: "2026-12-31",
      annualise: false,
    },
    rules2026
  );

  const seTaxCents = estimate.se.totalCents;
  const incomeTaxCents = estimate.federal.totalCents;
  const totalTaxCents = estimate.totalTaxCents;
  const quarterlyPaymentCents = Math.round(totalTaxCents / 4);

  return {
    incomeDollars: rawIncome,
    deductionsDollars: rawDeductions,
    filingStatus: input.filingStatus,
    incomeCents,
    deductionsCents,
    netProfitCents: estimate.netProfitCents,
    seTaxCents,
    incomeTaxCents,
    totalTaxCents,
    quarterlyPaymentCents,
    formattedSeTax: formatUSD(seTaxCents),
    formattedIncomeTax: formatUSD(incomeTaxCents),
    formattedTotalTax: formatUSD(totalTaxCents),
    formattedQuarterlyPayment: formatUSD(quarterlyPaymentCents),
  };
}
