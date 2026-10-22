import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { runDaily } from "./service";

const enabled = process.env.RUN_DATABASE_TESTS === "true";
// These tests invoke a platform-wide job. Refuse any non-disposable database.
if (enabled && !/_test$|_ci$/.test(new URL(process.env.DATABASE_URL!).pathname)) throw new Error("Database job tests require a database ending in _test or _ci.");
const ids: string[] = [];
afterAll(async () => {
  if (!enabled) return;
  await db.income.deleteMany({ where: { userId: { in: ids } } });
  await db.invoice.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
describe.skipIf(!enabled)("daily job with PostgreSQL", () => {
  it("preserves attached/fresh scans and deduplicates concurrent/retried reminders in the database", async () => {
    const now = new Date("2026-04-01T12:00:00Z");
    const createUser = async (active: boolean) => {
      const user = await db.user.create({ data: { name: "Job integration", email: `job-${crypto.randomUUID()}@example.test`, passwordHash: "unused-integration-fixture", isActive: active } });
      ids.push(user.id); return user;
    };
    const owner = await createUser(true), other = await createUser(true), inactive = await createUser(false);
    const client = await db.client.create({ data: { userId: owner.id, name: "Fixture client" } });
    const expense = await db.expense.create({ data: { userId: owner.id, vendor: "Fixture", amountCents: 100, date: now } });
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const scan = (createdAt: Date, expenseId?: string) => db.receipt.create({ data: { userId: owner.id, createdAt, expenseId, image, size: image.length, mimeType: "image/png" } });
    const expired = await scan(new Date(now.getTime() - 86400001));
    const boundary = await scan(new Date(now.getTime() - 86400000));
    const fresh = await scan(now);
    const attached = await scan(new Date(now.getTime() - 2 * 86400000), expense.id);
    for (const status of ["SENT", "OVERDUE", "DRAFT", "PAID", "VOID"] as const) await db.invoice.create({ data: { userId: owner.id, clientId: client.id, number: `FIX-${status}`, status, issueDate: new Date("2026-03-01"), dueDate: new Date("2026-03-31") } });
    await db.invoice.create({ data: { userId: owner.id, clientId: client.id, number: "FIX-TODAY", status: "SENT", issueDate: now, dueDate: now } });
    const results = await Promise.all([runDaily(now), runDaily(now)]);
    expect(results.reduce((sum, r) => sum + r.receiptsDeleted, 0)).toBe(1);
    expect(await db.receipt.findUnique({ where: { id: expired.id } })).toBeNull();
    expect(await db.receipt.count({ where: { id: { in: [boundary.id, fresh.id, attached.id] } } })).toBe(3);
    const reminders = await db.notification.findMany({ where: { userId: owner.id } });
    expect(reminders).toHaveLength(3);
    expect(reminders.filter(n => n.type === "INVOICE_OVERDUE")).toHaveLength(2);
    expect(await db.notification.count({ where: { userId: other.id } })).toBe(1);
    expect(await db.notification.count({ where: { userId: inactive.id } })).toBe(0);
    const read = reminders[0];
    await db.notification.update({ where: { id: read.id }, data: { readAt: now } });
    expect((await runDaily(now)).notificationsCreated).toBe(0);
    expect((await db.notification.findUnique({ where: { id: read.id } }))?.readAt).toEqual(now);
    const audit = await db.auditLog.findFirst({ where: { action: "JOB_RUN", entityId: "2026-04-01" }, orderBy: { createdAt: "desc" } });
    expect(audit).toMatchObject({ userId: null, metadata: { receiptsDeleted: 0, notificationsCreated: 0 } });
  }, 30000);
});
