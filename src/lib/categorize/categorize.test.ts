import { describe, expect, it } from "vitest";
import { suggestCategory } from ".";
import { categories, deductibleAmount } from "@/lib/tax";
describe("deterministic category suggestions", () => {
  it.each([
    ["Dell", "COMPUTER_HARDWARE"], ["APPLE STORE", "COMPUTER_HARDWARE"], ["Lenovo", "COMPUTER_HARDWARE"], ["Monitor", "COMPUTER_HARDWARE"], ["laptop", "COMPUTER_HARDWARE"],
    ["PTCL", "INTERNET_PHONE"], ["Verizon", "INTERNET_PHONE"], ["Comcast", "INTERNET_PHONE"], ["Jazz", "INTERNET_PHONE"], ["Internet", "INTERNET_PHONE"], ["Broadband", "INTERNET_PHONE"], ["Mobile", "INTERNET_PHONE"],
    ["Uber", "TRAVEL"], ["Careem", "TRAVEL"], ["Airline", "TRAVEL"], ["Hotel", "TRAVEL"], ["Airbnb", "TRAVEL"],
    ["Adobe", "SOFTWARE_AND_SUBSCRIPTIONS"], ["GitHub", "SOFTWARE_AND_SUBSCRIPTIONS"], ["AWS", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Zoom", "SOFTWARE_AND_SUBSCRIPTIONS"],
    ["Restaurant", "MEALS"], ["Cafe", "MEALS"], ["Café", "MEALS"], ["Google Ads", "ADVERTISING"], ["Fuel", "CAR_AND_TRUCK"], ["Insurance", "INSURANCE"], ["Accountant", "LEGAL_AND_PROFESSIONAL"],
    ["Staples", "OFFICE_EXPENSE"], ["Supplies", "SUPPLIES"], ["Coursera", "EDUCATION"], ["Electricity", "UTILITIES"], ["Coworking", "RENT_AND_LEASE"], ["Fiverr", "CONTRACT_LABOR"], ["Home office", "HOME_OFFICE"],
  ])("recognizes %s", (vendor, category) => expect(suggestCategory({ vendor })).toMatchObject({ category, confidence: 0.95 }));
  it("prioritizes vendors, normalizes punctuation and has a repeatable text fallback", () => {
    expect(suggestCategory({ vendor: "GitHub, Inc.", text: "Laptop hosting" })).toMatchObject({ category: "SOFTWARE_AND_SUBSCRIPTIONS", matchedKeyword: "github" });
    const input = { vendor: "Shop", text: "New LAPTOP purchase", amount: 120000 };
    expect(suggestCategory(input)).toEqual({ category: "COMPUTER_HARDWARE", confidence: 0.7, matchedKeyword: "laptop" });
    expect(suggestCategory(input)).toEqual(suggestCategory({ ...input, amount: 1 }));
  });
  it("avoids substring matches and leaves unknown purchases for review", () => {
    for (const text of ["lawson ubercool", "cafeine", "delicious", "", "1234"]) expect(suggestCategory({ text }).category).toBe("OTHER");
    expect(suggestCategory({ vendor: null, text: null })).toEqual({ category: "OTHER", confidence: 0, matchedKeyword: null });
  });
  it.each(["COMPUTER_HARDWARE", "INTERNET_PHONE"] as const)("applies business use to %s at 100%%", category => {
    expect(categories[category].factorBasisPoints).toBe(10000);
    expect(deductibleAmount(10001, 75, category)).toBe(7501);
  });
});
