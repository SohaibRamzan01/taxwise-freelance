import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { annualEstimate, quarterlySchedule, quarterlyPresentation, deductibleAmount, categories, rules2026 } from "@/lib/tax";
import { today } from "./service";
import { effectiveStatus } from "./invoices";
import { settingsSchema } from "./validation";

export const profileSelect = { filingStatus: true, taxYear: true, priorYearTaxCents: true, priorYearAgiCents: true, useSafeHarbour: true, businessName: true, businessAddress: true, businessEmail: true, businessPhone: true, currency: true } as const;
export async function getSettings(userId: string) {
  const profile = await db.user.findUnique({ where: { id: userId }, select: profileSelect });
  if (!profile) throw new ApiError(404, "NOT_FOUND", "Profile not found.");
  return profile;
}
export async function updateSettings(userId: string, body: unknown) {
  return db.user.update({ where: { id: userId }, data: settingsSchema.parse(body), select: profileSelect });
}

export async function taxSummary(userId: string, options: { year?: number; asOf?: string; annualise?: boolean } = {}) {
  const profile = await getSettings(userId);
  const year = options.year ?? profile.taxYear;
  if (year !== rules2026.year) throw new ApiError(400, "UNSUPPORTED_YEAR", "Only the 2026 US federal rules are available.");
  const asOf = options.asOf ?? today();
  if (asOf < `${year}-01-01` || asOf > today()) throw new ApiError(400, "INVALID_AS_OF", "As-of date must be within the tax year or later, and no later than today.");
  const start = new Date(`${year}-01-01`);
  const until = new Date(Math.min(new Date(`${year + 1}-01-01`).getTime(), new Date(asOf).getTime() + 86400000));
  const where = { userId, date: { gte: start, lt: until } };
  const [income, expenses, payments] = await Promise.all([
    db.income.findMany({ where }), db.expense.findMany({ where }), db.estimatedPayment.findMany({ where: { userId, taxYear: year, date: { lte: new Date(asOf) } } }),
  ]);
  const incomeCents = income.reduce((sum, row) => sum + row.amountCents, 0);
  const deductionsCents = expenses.reduce((sum, row) => sum + deductibleAmount(row.amountCents, row.businessUsePercent, row.category), 0);
  const estimate = annualEstimate({ incomeCents, deductionsCents, filingStatus: profile.filingStatus, asOf, annualise: options.annualise }, rules2026);
  const schedule = quarterlySchedule({ ...profile, totalTaxCents: estimate.totalTaxCents, asOf, payments: payments.map(p => ({ ...p, date: p.date.toISOString().slice(0, 10) })) }, rules2026);
  return { profile, estimate, schedule, plan: quarterlyPresentation(schedule, asOf), income, expenses, payments };
}

export async function dashboard(userId: string) {
  const { profile, estimate, schedule, plan, income, expenses } = await taxSummary(userId);
  const invoices = await db.invoice.findMany({ where: { userId, status: { in: ["SENT", "OVERDUE"] } }, include: { client: true }, orderBy: [{ dueDate: "asc" }, { id: "asc" }] });
  const monthly = Array.from({ length: 12 }, (_, month) => ({ month: new Date(Date.UTC(estimate.year, month, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" }), incomeCents: 0, expenseCents: 0 }));
  income.forEach(row => { monthly[row.date.getUTCMonth()].incomeCents += row.amountCents; });
  expenses.forEach(row => { monthly[row.date.getUTCMonth()].expenseCents += row.amountCents; });
  const deductions = Object.entries(categories).map(([category, info]) => ({ category, label: info.label, amountCents: expenses.filter(row => row.category === category).reduce((sum, row) => sum + deductibleAmount(row.amountCents, row.businessUsePercent, row.category), 0) })).filter(row => row.amountCents > 0);
  return { year: estimate.year, currency: profile.currency,
    kpis: { incomeCents: estimate.ytdIncomeCents, expenseCents: expenses.reduce((sum, row) => sum + row.amountCents, 0), deductionsCents: estimate.ytdDeductionsCents, estimatedTaxOwedCents: schedule.estimatedBalanceCents, nextDueDate: schedule.nextDueDate, outstandingCents: invoices.reduce((sum, row) => sum + row.totalCents, 0) },
    monthly, deductions, outstandingInvoices: invoices.slice(0, 10).map(row => ({ ...row, status: effectiveStatus(row, today()) })),
    paymentPlan: { ...plan, method: schedule.method },
  };
}
