import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { write } from "@/lib/domain/service";
import { dateString } from "@/lib/domain/validation";

export const adminQuery = z.object({ search: z.string().trim().max(200).default(""), page: z.coerce.number().int().min(1).max(100000).default(1), role: z.enum(["USER", "ADMIN"]).optional(), isActive: z.enum(["true", "false"]).optional(), action: z.string().max(100).optional(), entityType: z.string().max(100).optional(), userId: z.string().max(100).optional(), from: dateString.optional(), to: dateString.optional() }).strict().refine(q => !q.from || !q.to || q.from <= q.to, "End date must follow start date.");
export const userPatch = z.object({ role: z.enum(["USER", "ADMIN"]).optional(), isActive: z.boolean().optional() }).strict().refine(p => Object.keys(p).length > 0, "Choose a change.");
const userSelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;
type Query = z.infer<typeof adminQuery>;
export async function listUsers(q: Query) {
  const where: Prisma.UserWhereInput = { ...(q.search ? { OR: ["name", "email"].map(field => ({ [field]: { contains: q.search, mode: "insensitive" } })) } : {}), ...(q.role ? { role: q.role } : {}), ...(q.isActive ? { isActive: q.isActive === "true" } : {}) };
  const [data, total] = await Promise.all([db.user.findMany({ where, select: userSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (q.page - 1) * 20, take: 20 }), db.user.count({ where })]);
  return { data, pagination: { total, pages: Math.ceil(total / 20) } };
}
export async function changeUser(actorId: string, id: string, input: z.infer<typeof userPatch>) {
  const patch = userPatch.parse(input);
  if (actorId === id && (patch.role === "USER" || patch.isActive === false)) throw new ApiError(409, "SELF_CHANGE", "You cannot demote or deactivate your own account.");
  return write(actorId, async tx => {
    const before = await tx.user.findUnique({ where: { id }, select: userSelect });
    if (!before) throw new ApiError(404, "NOT_FOUND", "User not found.");
    const after = await tx.user.update({ where: { id }, data: patch, select: userSelect });
    await tx.auditLog.create({ data: { userId: actorId, action: "USER_UPDATE", entityType: "users", entityId: id, metadata: { before: { role: before.role, isActive: before.isActive }, after: { role: after.role, isActive: after.isActive } } } });
    return after;
  });
}
export async function listAudit(q: Query) {
  const where: Prisma.AuditLogWhereInput = {
    ...(q.userId ? { userId: q.userId } : {}), ...(q.action ? { action: q.action } : {}), ...(q.entityType ? { entityType: q.entityType } : {}),
    ...(q.search ? { OR: [{ action: { contains: q.search, mode: "insensitive" } }, { entityId: { contains: q.search, mode: "insensitive" } }, { user: { email: { contains: q.search, mode: "insensitive" } } }] } : {}),
    ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lt: new Date(new Date(q.to).getTime() + 86400000) } : {}) } } : {}),
  };
  const [data, total] = await Promise.all([db.auditLog.findMany({ where, include: { user: { select: { email: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (q.page - 1) * 20, take: 20 }), db.auditLog.count({ where })]);
  return { data, pagination: { total, pages: Math.ceil(total / 20) } };
}

export type WeeklyRow = { week: Date; signups: bigint | number; invoices: bigint | number; invoiceValueCents: bigint | number; expenses: bigint | number; activeUsers?: bigint | number };
export function weeklySeries(rows: WeeklyRow[], now = new Date()) {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return Array.from({ length: 12 }, (_, i) => {
    const day = new Date(monday); day.setUTCDate(day.getUTCDate() - (11 - i) * 7);
    const key = day.toISOString().slice(0, 10), row = rows.find(r => r.week.toISOString().slice(0, 10) === key);
    return { week: key, signups: Number(row?.signups ?? 0), invoices: Number(row?.invoices ?? 0), invoiceValueCents: Number(row?.invoiceValueCents ?? 0), expenses: Number(row?.expenses ?? 0), activeUsers: Number(row?.activeUsers ?? 0) };
  });
}
export async function overview() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [users, enabledUsers, active, invoices, expenses, weekly] = await Promise.all([
    db.user.count(), db.user.count({ where: { isActive: true } }),
    db.auditLog.groupBy({ by: ["userId"], where: { action: { in: ["LOGIN", "SIGNUP"] }, createdAt: { gte: since }, user: { isActive: true } } }),
    db.invoice.aggregate({ _count: true, _sum: { totalCents: true } }), db.expense.count(),
    db.$queryRaw<WeeklyRow[]>`SELECT metrics.week, (SELECT COUNT(DISTINCT a."userId") FROM "AuditLog" a JOIN "User" u ON u.id = a."userId" WHERE u."isActive" = true AND a.action IN ('LOGIN', 'SIGNUP') AND a."createdAt" >= metrics.week AND a."createdAt" < metrics.week + interval '1 week') AS "activeUsers", SUM(signups)::bigint AS signups, SUM(invoices)::bigint AS invoices, SUM(value)::bigint AS "invoiceValueCents", SUM(expenses)::bigint AS expenses FROM (
      SELECT date_trunc('week', "createdAt") AS week, COUNT(*) AS signups, 0 AS invoices, 0::bigint AS value, 0 AS expenses FROM "User" WHERE "createdAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '11 weeks' GROUP BY 1
      UNION ALL SELECT date_trunc('week', "createdAt"), 0, COUNT(*), SUM("totalCents"), 0 FROM "Invoice" WHERE "createdAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '11 weeks' GROUP BY 1
      UNION ALL SELECT date_trunc('week', "createdAt"), 0, 0, 0, COUNT(*) FROM "Expense" WHERE "createdAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '11 weeks' GROUP BY 1
      UNION ALL SELECT date_trunc('week', "createdAt"), 0, 0, 0, 0 FROM "AuditLog" WHERE action IN ('LOGIN', 'SIGNUP') AND "createdAt" >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - interval '11 weeks' GROUP BY 1
    ) metrics GROUP BY metrics.week ORDER BY metrics.week`,
  ]);
  return { users, enabledUsers, activeUsers: active.length, invoices: invoices._count, invoiceValueCents: invoices._sum.totalCents ?? 0, expenses, weekly: weeklySeries(weekly) };
}
