import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => {
  const table = () => ({ findMany: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(), createMany: vi.fn() });
  return { expense: table(), income: table(), client: table(), invoice: table(), auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(), requireUser: vi.fn() };
});
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
import { bulk, commit, exportRoute, preview } from "./routes";
import { search } from "./search";
import { POST as categorize } from "@/app/api/expenses/categorize/route";
import { bulkSchema } from "./service";
import { ApiError } from "@/lib/errors";
const input = { date: "2026-06-01", vendor: "Adobe", amountCents: 2999, category: "SOFTWARE_AND_SUBSCRIPTIONS" };
const request = (path: string, method = "GET", body?: unknown, origin = "http://localhost") => new Request(`http://localhost${path}`, { method, headers: { origin, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost"); vi.stubEnv("GEMINI_API_KEY", "");
  mock.requireUser.mockResolvedValue({ id: "owner" }); mock.$transaction.mockImplementation(async work => work(mock));
  mock.expense.count.mockResolvedValue(2); mock.expense.deleteMany.mockResolvedValue({ count: 2 }); mock.expense.updateMany.mockResolvedValue({ count: 2 }); mock.expense.createMany.mockResolvedValue({ count: 1 });
  for (const table of [mock.expense, mock.income, mock.client, mock.invoice]) table.findMany.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());
describe("batch and import routes", () => {
  it.each(["delete", "categorize"])("%s uses one scoped transaction and an audit entry", async action => {
    const response = await bulk(request("/api/expenses/bulk", "POST", { action, ids: ["a", "b"], ...(action === "categorize" ? { category: "MEALS" } : {}) }));
    expect(response.status).toBe(200); expect(mock.$transaction).toHaveBeenCalledTimes(1);
    const table = action === "delete" ? mock.expense.deleteMany : mock.expense.updateMany;
    expect(table).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner", id: { in: ["a", "b"] } } }));
    expect(mock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "owner", action: action === "delete" ? "BULK_DELETE" : "BULK_CATEGORIZE", metadata: expect.objectContaining({ ids: ["a", "b"], count: 2 }) }) });
  });
  it("rejects mixed-tenant/missing selections without partial changes or audit", async () => {
    mock.expense.count.mockResolvedValue(1);
    const response = await bulk(request("/api/expenses/bulk", "POST", { action: "delete", ids: ["owned", "foreign"] }));
    expect(response.status).toBe(404); expect(mock.expense.deleteMany).not.toHaveBeenCalled(); expect(mock.auditLog.create).not.toHaveBeenCalled();
  });
  it("rejects duplicate IDs, excessive selections, empty selections and arbitrary categories", () => {
    for (const ids of [[], ["a", "a"], Array.from({ length: 101 }, (_, i) => String(i))]) expect(bulkSchema.safeParse({ action: "delete", ids }).success).toBe(false);
    expect(bulkSchema.safeParse({ action: "categorize", ids: ["a"], category: "INVALID" }).success).toBe(false);
  });
  it("previews without writes, then commits validated rows with the owner's ID", async () => {
    const response = await preview(request("/api/expenses/import/preview", "POST", { csv: "date,vendor,amount\n2026-06-01,Adobe,29.99" }));
    expect(response.status).toBe(200); const rows = (await response.json()).data;
    expect(mock.expense.createMany).not.toHaveBeenCalled();
    expect((await commit(request("/api/expenses/import", "POST", { rows: rows.map((r: { data: unknown }) => r.data) }))).status).toBe(201);
    expect(mock.expense.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: "owner", date: new Date("2026-06-01"), amountCents: 2999 })] });
    expect(mock.auditLog.create).toHaveBeenCalledWith({ data: { userId: "owner", action: "IMPORT", entityType: "expenses", metadata: { count: 1 } } });
  });
  it("revalidates the whole import before writing, disallows tenant/receipt IDs and accepts bounded large batches", async () => {
    for (const bad of [{ ...input, userId: "foreign" }, { ...input, receiptId: "foreign" }, { ...input, amountCents: -1 }, { ...input, date: "2026-02-30" }]) expect((await commit(request("/api/expenses/import", "POST", { rows: [input, bad] }))).status).toBe(400);
    expect(mock.expense.createMany).not.toHaveBeenCalled();
    expect((await commit(request("/api/expenses/import", "POST", { rows: Array.from({ length: 50 }, () => ({ ...input, notes: "a".repeat(500) })) }))).status).toBe(201);
    expect((await preview(request("/api/expenses/import/preview", "POST", { csv: "a".repeat(128001) }))).status).toBe(400);
  });
  it("propagates audit failure through the transaction instead of reporting success", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mock.auditLog.create.mockRejectedValue(new Error("audit failed"));
    expect((await bulk(request("/api/expenses/bulk", "POST", { action: "delete", ids: ["a", "b"] }))).status).toBe(500);
    log.mockRestore();
  });
});
describe("filtered exports, search and category boundary", () => {
  it.each(["expenses", "income"] as const)("exports all matching %s rows with tenant/date/search/category scope", async entity => {
    const response = await exportRoute(entity)(request(`/api/${entity}/export?search=Adobe&from=2026-01-01&to=2026-12-31&page=5&pageSize=1${entity === "expenses" ? "&category=MEALS" : ""}`));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store"); expect(response.headers.get("content-type")).toContain("text/csv");
    expect((entity === "expenses" ? mock.expense : mock.income).findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", OR: expect.any(Array), date: expect.any(Object), ...(entity === "expenses" ? { category: "MEALS" } : {}) }), take: 10001 }));
    expect((entity === "expenses" ? mock.expense : mock.income).findMany.mock.calls[0][0]).not.toHaveProperty("skip");
  });
  it("rejects an oversized export instead of silently truncating", async () => {
    mock.expense.findMany.mockResolvedValue(Array(10001).fill(input));
    expect((await exportRoute("expenses")(request("/api/expenses/export"))).status).toBe(400);
  });
  it("searches all three entities within the current tenant with safe projections", async () => {
    expect((await search(request("/api/search?q=Adobe"))).status).toBe(200);
    for (const table of [mock.expense, mock.client, mock.invoice]) expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner" }), take: 5, select: expect.any(Object) }));
    expect((await search(request("/api/search?q=a"))).status).toBe(400);
    expect((await categorize(request("/api/expenses/categorize", "POST", { vendor: "Adobe", amount: 2999 }))).status).toBe(200);
    expect((await categorize(request("/api/expenses/categorize", "POST", { vendor: "Adobe", amount: -1 }))).status).toBe(400);
  });
  it("requires authentication for every new route and matching origin for writes", async () => {
    mock.requireUser.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Sign in"));
    for (const [handler, method, body] of [[bulk, "POST", {}], [commit, "POST", {}], [preview, "POST", {}], [categorize, "POST", {}], [search, "GET", undefined], [exportRoute("expenses"), "GET", undefined], [exportRoute("income"), "GET", undefined]] as const) expect((await handler(request("/api/test", method, body))).status).toBe(401);
    for (const handler of [bulk, commit, preview, categorize]) expect((await handler(request("/api/test", "POST", {}, "https://foreign.example"))).status).toBe(403);
    expect(mock.$transaction).not.toHaveBeenCalled(); expect(mock.expense.findMany).not.toHaveBeenCalled();
  });
});
