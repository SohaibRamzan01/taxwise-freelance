import { describe, expect, it } from "vitest";
import { dollarsToCents, moneyText, formatMoney } from "./money";
describe("bounded money parsing", () => {
  it("converts decimals exactly at the database boundary", () => {
    expect(dollarsToCents("0")).toBe(0); expect(dollarsToCents("1.2")).toBe(120);
    expect(dollarsToCents("21474836.47")).toBe(2147483647);
    expect(moneyText(12345)).toBe("123.45"); expect(formatMoney(12345)).toBe("$123.45");
  });
  it.each(["21474836.48", "1.234", "-1", "1e3", "", "9".repeat(100000)])("rejects invalid or oversized amounts", value => {
    expect(() => dollarsToCents(value)).toThrow();
  });
});
