import { describe, expect, it } from "vitest";
import { taxPaymentLabels } from "./labels";

describe("tax payment wording", () => {
  it("distinguishes projected liability from the safe-harbour payment target", () => {
    const labels = taxPaymentLabels(2026, "SAFE_HARBOUR", true);
    expect(labels.balance).toBe("Estimated tax still owed for 2026");
    expect(labels.balanceHint).toBe("Projected annual tax minus payments made.");
    expect(labels.target).toBe("Payment target still due for 2026");
    expect(labels.targetHint).toContain("final tax may be higher");
    expect(labels.method).toBe("Payment method: safe harbour");
  });
  it("explains the active regular method and actual YTD estimates", () => {
    const labels = taxPaymentLabels(2027, "REGULAR", false);
    expect(labels.balance).toContain("2027");
    expect(labels.balanceHint).toContain("future earnings excluded");
    expect(labels.targetHint).toContain("100% of estimated tax");
    expect(labels.method).toBe("Payment method: regular estimate");
  });
});
