import { z } from "zod";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/domain/summary";
import { buildTaxSummary } from "./summary";
export const reportQuerySchema = z.object({
  year: z.coerce.number().pipe(z.literal(2026)).default(2026),
  quarter: z.preprocess(v => v === "" ? undefined : v, z.coerce.number().int().min(1).max(4).optional()),
  format: z.enum(["pdf", "csv", "json"]).default("pdf"),
}).strict();
export async function loadTaxReport(user: { id: string; name: string; email: string }, query: z.infer<typeof reportQuerySchema>) {
  const asOf = new Date().toISOString().slice(0, 10);
  const where = { userId: user.id, date: { gte: new Date(`${query.year}-01-01`), lt: new Date(`${query.year + 1}-01-01`), lte: new Date(asOf) } };
  const [profile, income, expenses, payments] = await Promise.all([
    getSettings(user.id), db.income.findMany({ where, select: { date: true, amountCents: true } }),
    db.expense.findMany({ where, select: { date: true, amountCents: true, category: true, businessUsePercent: true } }),
    db.estimatedPayment.findMany({ where: { userId: user.id, taxYear: query.year, date: { lte: new Date(asOf) } }, select: { date: true, amountCents: true, taxYear: true, quarter: true }, orderBy: [{ date: "asc" }, { id: "asc" }] }),
  ]);
  const dateStrings = <T extends { date: Date }>(rows: T[]) => rows.map(r => ({ ...r, date: r.date.toISOString().slice(0, 10) }));
  return buildTaxSummary({ ...query, asOf, profile: { ...profile, name: user.name, email: user.email }, income: dateStrings(income), expenses: dateStrings(expenses), payments: dateStrings(payments) });
}
