import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { categories } from "./tax/categories";
import { categoryColor, categoryColors } from "./category-colors";

function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(h => {
    const c = parseInt(h, 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + .05) / (low + .05);
}
describe("category palette", () => {
  it("covers every expense category, regardless of chart order", () => {
    expect(Object.keys(categoryColors).sort()).toEqual(Object.keys(categories).sort());
  });
  it("uses a safe fallback for an unrecognised category from a summary", () => {
    expect(categoryColor("MEALS")).toBe(categoryColors.MEALS);
    expect(categoryColor("unknown")).toBe(categoryColors.OTHER);
    expect(categoryColor("constructor")).toBe(categoryColors.OTHER);
  });
  it.each(Object.entries(categoryColors))("keeps %s labels readable on their chip", (_, color) => {
    expect(contrast("#14213D", color)).toBeGreaterThanOrEqual(4.5);
  });
});
describe("theme text contrast", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  for (const [theme, selector] of [["light", ":root {"], ["dark", ':root[data-theme="dark"] {']]) {
    const block = css.slice(css.indexOf(selector)).split("}")[0];
    const base = css.slice(css.indexOf(":root {")).split("}")[0];
    const tokens = Object.fromEntries([...(base + block).matchAll(/--([\w-]+):\s*(#[\da-fA-F]{6})/g)].map(m => [m[1], m[2]]));
    it(`${theme} text, placeholders and errors meet 4.5:1 on app surfaces`, () => {
      for (const bg of ["ground", "surface", "sunk"]) {
        for (const fg of ["ink", "ink-2", "ink-3", "out"]) expect(contrast(tokens[fg], tokens[bg]), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(tokens.out, tokens["error-surface"])).toBeGreaterThanOrEqual(4.5);
      for (const bg of ["hl", "c-rev", "c-cogs", "c-opex", "c-excl"]) expect(contrast(tokens["on-hl"], tokens[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
