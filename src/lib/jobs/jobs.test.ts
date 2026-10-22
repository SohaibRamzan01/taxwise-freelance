import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ receipt: { deleteMany: vi.fn() }, invoice: { findMany: vi.fn() }, user: { findMany: vi.fn() }, notification: { createMany: vi.fn() }, auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
import { dailyPlan } from "./plan";
import { runDaily } from "./service";
import { GET as daily } from "@/app/api/cron/daily/route";
const now = new Date("2026-04-01T15:30:00Z");
const invoice = { id: "i1", userId: "owner", number: "INV-0001", dueDate: new Date("2026-03-31") };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CRON_SECRET", "test-cron-secret");
  mock.$transaction.mockImplementation(async work => work(mock));
  mock.receipt.deleteMany.mockResolvedValue({ count: 2 }); mock.invoice.findMany.mockResolvedValue([invoice]);
  mock.user.findMany.mockResolvedValue([{ id: "owner", taxYear: 2026 }]); mock.notification.createMany.mockResolvedValue({ count: 2 });
});
afterEach(() => vi.unstubAllEnvs());
describe("daily reminder planning", () => {
  it("uses a strict 24-hour cleanup cutoff and an inclusive 14-day UTC deadline window", () => {
    const plan = dailyPlan(now, [invoice, { ...invoice, id: "today", dueDate: new Date("2026-04-01") }], [{ id: "owner", taxYear: 2026 }, { id: "unsupported", taxYear: 2027 }]);
    expect(plan.cutoff).toEqual(new Date("2026-03-31T15:30:00Z"));
    expect(plan.notifications).toHaveLength(2);
    expect(plan.notifications[0]).toMatchObject({ userId: "owner", key: "invoice:i1:2026-03-31", type: "INVOICE_OVERDUE" });
    expect(plan.notifications[1]).toMatchObject({ userId: "owner", key: "tax:2026:1", type: "TAX_DUE" });
    expect(dailyPlan(new Date("2026-03-31"), [], [{ id: "u", taxYear: 2026 }]).notifications).toEqual([]);
    expect(dailyPlan(new Date("2026-04-15T23:59:59Z"), [], [{ id: "u", taxYear: 2026 }]).notifications).toHaveLength(1);
    expect(dailyPlan(new Date("2026-04-16"), [], [{ id: "u", taxYear: 2026 }]).notifications).toEqual([]);
  });
  it("keeps stable per-event keys across days and handles Q4's next-January deadline", () => {
    expect(dailyPlan(now, [invoice], []).notifications).toEqual(dailyPlan(new Date("2026-04-02"), [invoice], []).notifications);
    expect(dailyPlan(new Date("2027-01-01"), [], [{ id: "u", taxYear: 2026 }]).notifications[0].key).toBe("tax:2026:4");
    expect(dailyPlan(new Date("2027-01-16"), [], [{ id: "u", taxYear: 2026 }]).notifications).toEqual([]);
  });
});
describe("daily transactional service", () => {
  it("cleans only expired unlinked scans, selects active overdue invoices, and audits exact counts", async () => {
    expect(await runDaily(now)).toEqual({ day: "2026-04-01", receiptsDeleted: 2, notificationsCreated: 2, remindersChecked: 2 });
    expect(mock.receipt.deleteMany).toHaveBeenCalledWith({ where: { expenseId: null, createdAt: { lt: new Date("2026-03-31T15:30:00Z") } } });
    expect(mock.invoice.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: new Date("2026-04-01") }, user: { isActive: true } } }));
    expect(mock.notification.createMany).toHaveBeenCalledWith({ data: dailyPlan(now, [invoice], [{ id: "owner", taxYear: 2026 }]).notifications, skipDuplicates: true });
    expect(mock.auditLog.create).toHaveBeenCalledWith({ data: { action: "JOB_RUN", entityType: "daily", entityId: "2026-04-01", metadata: { receiptsDeleted: 2, notificationsCreated: 2, remindersChecked: 2 } } });
    expect(mock.$queryRaw).toHaveBeenCalledOnce();
  });
  it("reports zero newly created reminders on repeats and avoids empty inserts", async () => {
    await runDaily(now); mock.notification.createMany.mockResolvedValue({ count: 0 });
    expect((await runDaily(now)).notificationsCreated).toBe(0);
    mock.notification.createMany.mockClear(); mock.invoice.findMany.mockResolvedValue([]); mock.user.findMany.mockResolvedValue([]);
    expect((await runDaily(now)).remindersChecked).toBe(0); expect(mock.notification.createMany).not.toHaveBeenCalled();
  });
  it("propagates failures so cleanup and notifications roll back with the audit", async () => {
    mock.auditLog.create.mockRejectedValue(new Error("audit unavailable"));
    await expect(runDaily(now)).rejects.toThrow("audit unavailable");
  });
});
describe("cron route authorization", () => {
  const request = (authorization?: string) => new Request("http://localhost/api/cron/daily", { headers: authorization ? { authorization } : {} });
  it("fails closed for missing configuration, missing/wrong credentials, or cookie-only calls", async () => {
    for (const auth of [undefined, "Bearer wrong", "test-cron-secret", "bearer test-cron-secret"]) expect((await daily(request(auth))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", ""); expect((await daily(request("Bearer test-cron-secret"))).status).toBe(401);
    expect(mock.$transaction).not.toHaveBeenCalled();
  });
  it("accepts the Vercel bearer header without Origin and never caches the result", async () => {
    const response = await daily(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    mock.$transaction.mockRejectedValue(new Error("database offline"));
    expect((await daily(request("Bearer test-cron-secret"))).status).toBe(500);
  });
});
