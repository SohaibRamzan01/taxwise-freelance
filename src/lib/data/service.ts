import { z } from "zod";
import { ExpenseCategory, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { listOptions, write } from "@/lib/domain/service";
import { expenseSchema, type ListQuery } from "@/lib/domain/validation";
import { ledgerCsv } from "./csv";

const ids = z.array(z.string().min(1).max(100)).min(1).max(100).refine(v => new Set(v).size === v.length, "Select unique expenses.");
export const bulkSchema = z.discriminatedUnion("action", [z.object({ action: z.literal("delete"), ids }).strict(), z.object({ action: z.literal("categorize"), ids, category: z.enum(ExpenseCategory) }).strict()]);
export async function bulkExpenses(userId: string, input: z.infer<typeof bulkSchema>) {
  const body = bulkSchema.parse(input);
  return write(userId, async tx => {
    const where = { userId, id: { in: body.ids } };
    if (await tx.expense.count({ where }) !== body.ids.length) throw new ApiError(404, "NOT_FOUND", "One or more expenses were not found. Refresh your selection.");
    const result = body.action === "delete" ? await tx.expense.deleteMany({ where }) : await tx.expense.updateMany({ where, data: { category: body.category } });
    await tx.auditLog.create({ data: { userId, action: body.action === "delete" ? "BULK_DELETE" : "BULK_CATEGORIZE", entityType: "expenses", metadata: { ids: body.ids, ...(body.action === "categorize" ? { category: body.category } : {}), count: result.count } } });
    return result;
  });
}
export const importSchema = z.object({ rows: z.array(expenseSchema.omit({ receiptId: true })).min(1).max(50) }).strict();
export async function importExpenses(userId: string, rows: z.infer<typeof importSchema>["rows"]) {
  return write(userId, async tx => {
    const result = await tx.expense.createMany({ data: rows.map(row => ({ ...row, userId })) });
    await tx.auditLog.create({ data: { userId, action: "IMPORT", entityType: "expenses", metadata: { count: result.count } } });
    return result;
  });
}
export async function exportLedger(entity: "expenses" | "income", userId: string, q: ListQuery) {
  const { where, orderBy } = listOptions(entity, userId, q);
  // Export all matching rows, independent of table pagination, with a bounded memory budget.
  const rows = entity === "expenses" ? await db.expense.findMany({ where: where as Prisma.ExpenseWhereInput, orderBy: orderBy as Prisma.ExpenseOrderByWithRelationInput[], take: 10001 }) : await db.income.findMany({ where: where as Prisma.IncomeWhereInput, orderBy: orderBy as Prisma.IncomeOrderByWithRelationInput[], take: 10001 });
  if (rows.length > 10000) throw new ApiError(400, "EXPORT_LIMIT", "Narrow your filters to export up to 10,000 rows.");
  return new Response(ledgerCsv(entity, rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${entity}.csv"` } });
}
