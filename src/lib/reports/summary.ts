import { annualEstimate, categories, cents, deductibleAmount, isoDate, quarterlySchedule, rules2026, type ExpenseCategory, type FilingStatus, type TaxRules } from "@/lib/tax";
export interface ReportProfile {
  name: string; email: string; businessName?: string | null; businessAddress?: string | null;
  filingStatus: FilingStatus; priorYearTaxCents: number; priorYearAgiCents: number; useSafeHarbour: boolean;
}
export interface ReportIncome { date: string; amountCents: number }
export interface ReportExpense extends ReportIncome { category: ExpenseCategory; businessUsePercent: number }
export interface ReportPayment extends ReportIncome { taxYear: number; quarter: number }
export const REPORT_DISCLAIMER = "Estimates are for planning purposes and are not tax advice. US federal, USD only. Simplified QBI assumes below-threshold eligibility. State taxes, credits, W-2 wages, capital gains and withholding are excluded. Category lines are planning mappings; hardware may require capitalization or depreciation. Review all deductions with a tax professional.";
export function reportPeriod(year: number, quarter?: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || (quarter !== undefined && (!Number.isInteger(quarter) || quarter < 1 || quarter > 4))) throw new RangeError("Invalid report period.");
  const start = new Date(Date.UTC(year, quarter ? (quarter - 1) * 3 : 0, 1));
  const until = new Date(Date.UTC(quarter === undefined || quarter === 4 ? year + 1 : year, quarter === undefined || quarter === 4 ? 0 : quarter * 3, 1));
  return { year, quarter: quarter ?? null, from: start.toISOString().slice(0, 10), to: new Date(until.getTime() - 86400000).toISOString().slice(0, 10), label: quarter ? `${year} / Quarter ${quarter}` : `${year} / Full year` };
}
/** Calendar-quarter actuals. The payment schedule uses full-year YTD actuals, never an isolated quarter. */
export function buildTaxSummary(input: { year: number; quarter?: number; asOf: string; profile: ReportProfile; income: ReportIncome[]; expenses: ReportExpense[]; payments: ReportPayment[] }, rules: TaxRules = rules2026) {
  if (input.year !== rules.year) throw new RangeError("Unsupported tax year.");
  isoDate(input.asOf);
  if (input.asOf < `${input.year}-01-01`) throw new RangeError("Tax year has not started.");
  const period = reportPeriod(input.year, input.quarter);
  const inYear = (row: ReportIncome) => { isoDate(row.date); cents(row.amountCents); return row.date >= `${input.year}-01-01` && row.date <= `${input.year}-12-31` && row.date <= input.asOf; };
  const inPeriod = (row: ReportIncome) => row.date >= period.from && row.date <= period.to;
  const ytdIncome = input.income.filter(inYear), ytdExpenses = input.expenses.filter(inYear);
  const income = ytdIncome.filter(inPeriod), expenses = ytdExpenses.filter(inPeriod);
  const sum = (rows: ReportIncome[]) => cents(rows.reduce((n, r) => n + r.amountCents, 0));
  const deductions = (rows: ReportExpense[]) => cents(rows.reduce((n, r) => n + deductibleAmount(r.amountCents, r.businessUsePercent, r.category), 0));
  const groups = Object.entries(categories).map(([category, info]) => {
    const rows = expenses.filter(row => row.category === category);
    return { category, label: info.label, scheduleC: info.scheduleC, count: rows.length, expenseCents: sum(rows), deductibleCents: deductions(rows) };
  });
  const incomeCents = sum(income), expenseCents = sum(expenses), deductionsCents = deductions(expenses);
  const estimate = annualEstimate({ incomeCents, deductionsCents, filingStatus: input.profile.filingStatus, asOf: input.asOf, annualise: false }, rules);
  const ytdEstimate = annualEstimate({ incomeCents: sum(ytdIncome), deductionsCents: deductions(ytdExpenses), filingStatus: input.profile.filingStatus, asOf: input.asOf, annualise: false }, rules);
  const payments = input.payments.filter(p => { isoDate(p.date); cents(p.amountCents); return p.taxYear === input.year && p.date <= input.asOf; });
  const schedule = quarterlySchedule({ ...input.profile, totalTaxCents: ytdEstimate.totalTaxCents, asOf: input.asOf, payments }, rules);
  const periodPayments = payments.filter(p => !input.quarter || p.quarter === input.quarter);
  return { period, asOf: input.asOf, profile: input.profile, groups, incomeCents, expenseCents, deductionsCents, netProfitCents: incomeCents - deductionsCents,
    estimate, ytdEstimate, schedule, paymentsCents: sum(periodPayments), payments: periodPayments, disclaimer: REPORT_DISCLAIMER,
    calculationNote: input.quarter ? "Quarter actuals are not annualised. Period tax applies annual deductions to this quarter alone for planning; it is not a quarterly filing liability. The payment schedule uses full-year YTD actual earnings and all payments assigned to this tax year." : "Actual earnings through the as-of date; no annualisation. Payments include those assigned to this tax year through the as-of date, including next-January payments." };
}
export type TaxSummary = ReturnType<typeof buildTaxSummary>;
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
export function deductionSummaryCsv(summary: TaxSummary) {
  const rows: (string | number)[][] = [["Tax year", "Quarter", "As of", "Category", "Schedule C line", "Entries", "Expenses USD", "Deductible USD"],
    ...summary.groups.map(g => [summary.period.year, summary.period.quarter ?? "Full year", summary.asOf, g.label, g.scheduleC, g.count, (g.expenseCents / 100).toFixed(2), (g.deductibleCents / 100).toFixed(2)]),
    [summary.period.year, summary.period.quarter ?? "Full year", summary.asOf, "TOTAL", "", summary.groups.reduce((n, g) => n + g.count, 0), (summary.expenseCents / 100).toFixed(2), (summary.deductionsCents / 100).toFixed(2)]];
  return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
