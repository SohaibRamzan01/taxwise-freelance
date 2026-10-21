import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() }, auditLog: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), groupBy: vi.fn() }, expense: { count: vi.fn() }, invoice: { aggregate: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(), requireAdmin: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: mock.requireAdmin }));
import { adminQuery, changeUser, listAudit, listUsers, overview, userPatch, weeklySeries } from "./service";
import { analytics, audit, updateUser, users } from "./routes";
import { ApiError } from "@/lib/errors";
const request = (path: string, method = "GET", body?: unknown, origin = "http://localhost") => new Request(`http://localhost${path}`, { method, headers: { origin, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost");
  mock.requireAdmin.mockResolvedValue({ id: "admin", role: "ADMIN" }); mock.$transaction.mockImplementation(async work => work(mock));
  mock.user.findUnique.mockResolvedValue({ id: "target", role: "USER", isActive: true }); mock.user.update.mockResolvedValue({ id: "target", role: "ADMIN", isActive: true }); mock.user.count.mockResolvedValue(2); mock.user.findMany.mockResolvedValue([]);
  mock.auditLog.findMany.mockResolvedValue([]); mock.auditLog.count.mockResolvedValue(0); mock.auditLog.groupBy.mockResolvedValue([{ userId: "admin" }]); mock.expense.count.mockResolvedValue(5); mock.invoice.aggregate.mockResolvedValue({ _count: 3, _sum: { totalCents: 10000 } }); mock.$queryRaw.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());
describe("admin service", () => {
  it("searches and filters users, paginates deterministically and selects no secrets", async () => {
    await listUsers(adminQuery.parse({ search: "test", role: "ADMIN", isActive: "false", page: 2 }));
    const args = mock.user.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ where: { role: "ADMIN", isActive: false, OR: expect.any(Array) }, skip: 20, take: 20 });
    expect(args.select).toEqual({ id: true, name: true, email: true, role: true, isActive: true, createdAt: true });
    expect(mock.user.count).toHaveBeenCalledWith({ where: args.where });
  });
  it.each([{ role: "USER" }, { isActive: false }, { role: "ADMIN", isActive: false }])("rejects destructive self changes %j before writing", async patch => {
    await expect(changeUser("admin", "admin", userPatch.parse(patch))).rejects.toMatchObject({ code: "SELF_CHANGE" });
    expect(mock.$transaction).not.toHaveBeenCalled(); expect(mock.user.update).not.toHaveBeenCalled();
  });
  it("changes access and audits before/after state in one transaction", async () => {
    await changeUser("admin", "target", { role: "ADMIN" });
    expect(mock.user.update).toHaveBeenCalledWith({ where: { id: "target" }, data: { role: "ADMIN" }, select: expect.not.objectContaining({ passwordHash: true }) });
    expect(mock.auditLog.create).toHaveBeenCalledWith({ data: { userId: "admin", action: "USER_UPDATE", entityType: "users", entityId: "target", metadata: { before: { role: "USER", isActive: true }, after: { role: "ADMIN", isActive: true } } } });
    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("handles missing users, invalid patches and audit failure", async () => {
    mock.user.findUnique.mockResolvedValueOnce(null);
    await expect(changeUser("admin", "missing", { isActive: false })).rejects.toMatchObject({ status: 404 });
    expect(mock.user.update).not.toHaveBeenCalled();
    expect(userPatch.safeParse({}).success).toBe(false); expect(userPatch.safeParse({ passwordHash: "bad" }).success).toBe(false); expect(userPatch.safeParse({ role: "SUPERADMIN" }).success).toBe(false);
    mock.auditLog.create.mockRejectedValue(new Error("audit failed")); await expect(changeUser("admin", "target", { isActive: false })).rejects.toThrow("audit failed");
  });
  it("filters audit by actor/action/entity/search and inclusive UTC dates", async () => {
    await listAudit(adminQuery.parse({ userId: "actor", action: "DELETE", entityType: "expenses", search: "client", from: "2026-01-01", to: "2026-01-31", page: 3 }));
    const args = mock.auditLog.findMany.mock.calls[0][0];
    expect(args).toMatchObject({ where: { userId: "actor", action: "DELETE", entityType: "expenses", OR: expect.any(Array), createdAt: { gte: new Date("2026-01-01"), lt: new Date("2026-02-01") } }, skip: 40, take: 20 });
    expect(mock.auditLog.count).toHaveBeenCalledWith({ where: args.where });
    expect(adminQuery.safeParse({ from: "2026-02-01", to: "2026-01-01" }).success).toBe(false);
  });
  it("zero fills twelve Monday UTC weeks across year boundaries and converts bigint", () => {
    const rows = weeklySeries([{ week: new Date("2025-12-29"), signups: 2n, invoices: 3n, invoiceValueCents: 12345n, expenses: 4n, activeUsers: 1n }], new Date("2026-01-04T23:59:59Z"));
    expect(rows).toHaveLength(12); expect(rows.at(-1)).toEqual({ week: "2025-12-29", signups: 2, invoices: 3, invoiceValueCents: 12345, expenses: 4, activeUsers: 1 }); expect(rows[0].signups).toBe(0);
    expect(weeklySeries([], new Date("2026-01-05" )).at(-1)?.week).toBe("2026-01-05");
  });
  it("summarizes enabled/logged-in users separately and handles an empty invoice ledger", async () => {
    expect(await overview()).toMatchObject({ users: 2, enabledUsers: 2, activeUsers: 1, invoices: 3, invoiceValueCents: 10000, expenses: 5, weekly: expect.any(Array) });
    expect(mock.auditLog.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ["userId"], where: expect.objectContaining({ action: { in: ["LOGIN", "SIGNUP"] }, user: { isActive: true } }) }));
    mock.invoice.aggregate.mockResolvedValue({ _count: 0, _sum: { totalCents: null } }); expect((await overview()).invoiceValueCents).toBe(0);
  });
});
describe("admin route authorization", () => {
  it.each([401, 403])("enforces the admin guard on every route (%s)", async status => {
    mock.requireAdmin.mockRejectedValue(new ApiError(status, status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Denied"));
    for (const handler of [analytics, audit, users]) expect((await handler(request("/api/admin/test"))).status).toBe(status);
    expect((await updateUser(request("/api/admin/users/target", "PATCH", { role: "ADMIN" }), context("target"))).status).toBe(status);
    expect(mock.requireAdmin).toHaveBeenCalledTimes(4); expect(mock.user.findMany).not.toHaveBeenCalled(); expect(mock.$transaction).not.toHaveBeenCalled(); expect(mock.$queryRaw).not.toHaveBeenCalled();
  });
  it("serves every route, validates inputs, rejects self changes and invalid origin", async () => {
    for (const handler of [analytics, audit, users]) { const response = await handler(request("/api/admin/test")); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); }
    expect((await updateUser(request("/api/admin/users/target", "PATCH", { role: "ADMIN" }), context("target"))).status).toBe(200);
    expect((await updateUser(request("/api/admin/users/admin", "PATCH", { isActive: false }), context("admin"))).status).toBe(409);
    expect((await updateUser(request("/api/admin/users/target", "PATCH", { isActive: false }, "https://foreign.example"), context("target"))).status).toBe(403);
    expect((await users(request("/api/admin/users?page=0"))).status).toBe(400);
    expect((await updateUser(request("/api/admin/users/target", "PATCH", { email: "changed" }), context("target"))).status).toBe(400);
  });
});
