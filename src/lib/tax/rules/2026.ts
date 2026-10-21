import type { Bracket, TaxRules } from "../types";

const brackets = (limits: number[]): Bracket[] => [...limits, Infinity].map((limit, i) => ({
  upToCents: Number.isFinite(limit) ? limit * 100 : null,
  rateBasisPoints: [1000, 1200, 2200, 2400, 3200, 3500, 3700][i],
}));

export const rules2026: TaxRules = {
  jurisdiction: "US_FEDERAL", year: 2026,
  standardDeductionCents: { SINGLE: 1610000, MARRIED_FILING_JOINTLY: 3220000, HEAD_OF_HOUSEHOLD: 2415000 },
  brackets: {
    SINGLE: brackets([12400, 50400, 105700, 201775, 256225, 640600]),
    MARRIED_FILING_JOINTLY: brackets([24800, 100800, 211400, 403550, 512450, 768700]),
    HEAD_OF_HOUSEHOLD: brackets([17700, 67450, 105700, 201750, 256200, 640600]),
  },
  netEarningsBasisPoints: 9235, socialSecurityBasisPoints: 1240, socialSecurityWageBaseCents: 18450000,
  medicareBasisPoints: 290, additionalMedicareBasisPoints: 90,
  additionalMedicareThresholdCents: { SINGLE: 20000000, HEAD_OF_HOUSEHOLD: 20000000, MARRIED_FILING_JOINTLY: 25000000 },
  qbiBasisPoints: 2000, safeHarbourAgiThresholdCents: 15000000,
  dueDates: ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"],
};
