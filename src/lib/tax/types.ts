export type FilingStatus = "SINGLE" | "MARRIED_FILING_JOINTLY" | "HEAD_OF_HOUSEHOLD";
export interface Bracket { upToCents: number | null; rateBasisPoints: number }
export interface TaxRules {
  jurisdiction: string;
  year: number;
  standardDeductionCents: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, readonly Bracket[]>;
  netEarningsBasisPoints: number;
  socialSecurityBasisPoints: number;
  socialSecurityWageBaseCents: number;
  medicareBasisPoints: number;
  additionalMedicareBasisPoints: number;
  additionalMedicareThresholdCents: Record<FilingStatus, number>;
  qbiBasisPoints: number;
  safeHarbourAgiThresholdCents: number;
  dueDates: readonly string[];
}
export interface AnnualInput {
  incomeCents: number;
  deductionsCents: number;
  filingStatus: FilingStatus;
  asOf: string;
  annualise?: boolean;
}
export interface Payment { quarter: number; amountCents: number; date: string }
