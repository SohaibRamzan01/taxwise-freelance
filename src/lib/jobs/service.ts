import { db } from "@/lib/db";
import { dailyPlan } from "./plan";

export async function runDaily(now = new Date()) {
  return db.$transaction(async tx => {
    // Serialize overlapping invocations; unique reminder keys also enforce idempotence.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(6006)::text`;
    const { day, cutoff } = dailyPlan(now, [], []);
    const removed = await tx.receipt.deleteMany({ where: { expenseId: null, createdAt: { lt: cutoff } } });
    const invoices = await tx.invoice.findMany({ where: { status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: new Date(day) }, user: { isActive: true } }, select: { id: true, userId: true, number: true, dueDate: true } });
    const users = await tx.user.findMany({ where: { isActive: true, taxYear: 2026 }, select: { id: true, taxYear: true } });
    const plan = dailyPlan(now, invoices, users);
    const added = plan.notifications.length ? await tx.notification.createMany({ data: plan.notifications, skipDuplicates: true }) : { count: 0 };
    const counts = { receiptsDeleted: removed.count, notificationsCreated: added.count, remindersChecked: plan.notifications.length };
    await tx.auditLog.create({ data: { action: "JOB_RUN", entityType: "daily", entityId: day, metadata: counts } });
    return { day, ...counts };
  }, { maxWait: 5000, timeout: 45000 });
}
