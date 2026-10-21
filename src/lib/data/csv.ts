import { dollarsToCents, moneyText } from "@/lib/money";
import { expenseSchema } from "@/lib/domain/validation";
import { categorizeExpense, type Suggestion } from "@/lib/ai";
import { ApiError } from "@/lib/errors";

export const expenseHeaders = ["date", "vendor", "amount", "category", "businessUsePercent", "paymentMethod", "notes"];
export function encodeCsv(rows: unknown[][]) {
  return rows.map(row => row.map(value => {
    let text = String(value ?? "");
    // Spreadsheet formula injection includes leading whitespace/control characters.
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n") + "\r\n";
}

/** RFC 4180 quoting, CRLF/LF, embedded newlines, and UTF-8 BOM. */
export function parseCsv(input: string): { line: number; cells: string[] }[] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [], value = "", quoted = false, closed = false, line = 1, start = 1;
  const push = () => { cells.push(value); if (cells.some(c => c.trim())) rows.push({ line: start, cells }); cells = []; value = ""; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } }
      else { value += c; if (c === "\n") line++; }
    } else if (c === ",") { cells.push(value); value = ""; closed = false; }
    else if (c === "\r" || c === "\n") { if (c === "\r" && text[i + 1] === "\n") i++; push(); line++; start = line; }
    else if (c === '"' && value === "" && !closed) quoted = true;
    else { if (closed || c === '"') throw new ApiError(400, "INVALID_CSV", `Invalid quoting at line ${line}.`); value += c; }
  }
  if (quoted) throw new ApiError(400, "INVALID_CSV", `Unclosed quote at line ${start}.`);
  push();
  return rows;
}

export type ImportRow = { line: number; data: Record<string, string | number>; errors: string[]; suggestion?: Suggestion };
export async function previewExpenses(csv: string): Promise<ImportRow[]> {
  const [header, ...rows] = parseCsv(csv);
  const headers = header?.cells.map(s => s.trim());
  if (!headers || !["date", "vendor", "amount"].every(h => headers.includes(h)) || headers.some(h => !expenseHeaders.includes(h)) || new Set(headers).size !== headers.length) throw new ApiError(400, "INVALID_CSV", `Use unique headers: ${expenseHeaders.join(", ")}. Date, vendor and amount are required.`);
  if (!rows.length || rows.length > 50) throw new ApiError(400, "INVALID_CSV", "Import between 1 and 50 expense rows at a time.");
  const result: ImportRow[] = [];
  // Bound concurrent external calls; duplicate vendor/description/amount rows share a suggestion.
  const cache = new Map<string, Promise<Suggestion>>();
  for (let offset = 0; offset < rows.length; offset += 10) {
    result.push(...await Promise.all(rows.slice(offset, offset + 10).map(async row => {
      const raw = Object.fromEntries(headers.map((h, i) => [h, row.cells[i]?.trim() ?? ""]));
      const data: Record<string, string | number> = { date: raw.date, vendor: raw.vendor, amountCents: 0, category: raw.category || "OTHER", businessUsePercent: raw.businessUsePercent ? Number(raw.businessUsePercent) : 100, paymentMethod: raw.paymentMethod || "OTHER", notes: raw.notes || "" };
      const errors: string[] = [];
      if (row.cells.length !== headers.length) errors.push("Column count does not match the header.");
      try { data.amountCents = dollarsToCents(raw.amount); } catch (e) { errors.push((e as Error).message); }
      const validation = expenseSchema.safeParse(data);
      if (!validation.success) errors.push(...validation.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
      let suggestion: Suggestion | undefined;
      if (!errors.length && !raw.category) {
        const input = { vendor: raw.vendor, description: raw.notes || "", amount: data.amountCents as number };
        const key = JSON.stringify(input);
        if (!cache.has(key)) cache.set(key, categorizeExpense(input));
        suggestion = await cache.get(key)!; data.category = suggestion.category;
      }
      return { line: row.line, data, errors, ...(suggestion ? { suggestion } : {}) };
    })));
  }
  return result;
}

export function ledgerCsv(entity: "expenses" | "income", rows: { date: Date; amountCents: number; notes: string | null; vendor?: string; source?: string; category?: string; businessUsePercent?: number; paymentMethod?: string }[]) {
  return encodeCsv([entity === "expenses" ? expenseHeaders : ["date", "source", "amount", "notes"], ...rows.map(r => entity === "expenses" ? [r.date.toISOString().slice(0, 10), r.vendor, moneyText(r.amountCents), r.category, r.businessUsePercent, r.paymentMethod, r.notes] : [r.date.toISOString().slice(0, 10), r.source, moneyText(r.amountCents), r.notes])]);
}
