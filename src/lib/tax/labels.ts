import type { QuarterlySchedule } from "./engine";

/** Shared wording for balances and payment targets; does not change the tax model. */
export function taxPaymentLabels(year: number, method: QuarterlySchedule["method"], annualised: boolean) {
  return {
    balance: `Estimated tax still owed for ${year}`,
    balanceHint: annualised
      ? "Projected annual tax minus payments made."
      : "Tax on actual YTD earnings minus payments made; future earnings excluded.",
    target: `Payment target still due for ${year}`,
    targetHint: method === "SAFE_HARBOUR"
      ? "Safe-harbour target minus payments made; final tax may be higher."
      : "Regular target (100% of estimated tax) minus payments made.",
    method: method === "SAFE_HARBOUR" ? "Payment method: safe harbour" : "Payment method: regular estimate",
  };
}
