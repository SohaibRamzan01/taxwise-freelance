import { suggestCategory } from "@/lib/categorize";
import { isoDate } from "@/lib/tax/engine";
function validDate(year: number, month: number, day: number): string | null {
  const value = `${year < 100 ? 2000 + year : year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  try { isoDate(value); return value; } catch { return null; }
}
function extractDate(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validDate(+iso[1], +iso[2], +iso[3]);
  const numeric = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})\b/);
  // US month-first by default; unambiguous day-first dates are also accepted.
  if (numeric) return validDate(+numeric[3], +numeric[1] > 12 ? +numeric[2] : +numeric[1], +numeric[1] > 12 ? +numeric[1] : +numeric[2]);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const named = text.match(/\b([a-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (named && months.includes(named[1].slice(0, 3).toLowerCase())) return validDate(+named[3], months.indexOf(named[1].slice(0, 3).toLowerCase()) + 1, +named[2]);
  const dayFirst = text.match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(20\d{2})\b/i);
  if (dayFirst && months.includes(dayFirst[2].slice(0, 3).toLowerCase())) return validDate(+dayFirst[3], months.indexOf(dayFirst[2].slice(0, 3).toLowerCase()) + 1, +dayFirst[1]);
  return null;
}
function amounts(line: string) {
  // Correct O/I only inside numeric tokens. Decimals exclude dates/phones/order numbers.
  return [...line.matchAll(/(?:^|[^\w.,-])(?:[$€£]\s{0,3})?([\dOI]{1,10}(?:[, ][\dOI]{3}){0,3}(?:\.[\dOI]{2})|[\dOI]{1,10},[\dOI]{2})(?![\w.,])/gi)].map(match => {
    const token = match[1].replace(/o/gi, "0").replace(/i/gi, "1").replaceAll(" ", "");
    const decimal = token.includes(".") ? token.replaceAll(",", "") : token.replace(",", ".");
    const [whole, fraction] = decimal.split(".");
    return Number(whole) * 100 + Number(fraction);
  }).filter(n => Number.isSafeInteger(n) && n >= 0 && n <= 2147483647);
}
export function parseReceiptText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const vendor = lines.find(line => /[a-z]{2}/i.test(line) && !/^(?:(?:receipt|invoice|tax invoice|welcome|thank you|date|time|tel|phone|sub\s*total|grand\s+total|total|amount\s+due)\b|www\.|https?:|\d)/i.test(line))?.slice(0, 200) ?? null;
  const ranked = lines.flatMap((line, index) => {
    const normalized = line.toUpperCase().replace(/T[O0]TA[L1I]/g, "TOTAL");
    if (/CHANGE|CASH|TENDERED|SAVINGS|TOTAL\s+(?:ITEMS|SAVINGS|DISCOUNT)/.test(normalized)) return [];
    const rank = /SUB\s*TOTAL/.test(normalized) ? 0 : /GRAND\s+TOTAL|AMOUNT\s+DUE|BALANCE\s+DUE/.test(normalized) ? 3 : /\bTOTAL\b/.test(normalized) ? 2 : /\bAMOUNT\b/.test(normalized) ? 1 : 0;
    const values = amounts(line);
    if (rank > 0 && !values.length && lines[index + 1]) values.push(...amounts(lines[index + 1]));
    return values.map(value => ({ value, rank }));
  });
  ranked.sort((a, b) => b.rank - a.rank || b.value - a.value);
  const totalCents = ranked[0]?.value ?? null;
  return { vendor, date: extractDate(rawText), totalCents, rawText, suggestion: suggestCategory({ vendor, text: rawText, amount: totalCents }) };
}
