import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { Entity } from "./validation";

const mock = vi.hoisted(() => {
  const table = () => ({ findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() });
  return { expense: table(), income: table(), client: table(), invoice: table(), invoiceItem: table(), estimatedPayment: table(), user: { update: vi.fn() }, auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(), requireUser: vi.fn() };
});
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
import { createRecord, deleteRecord, getRecord, listOptions, listRecords, updateRecord, write } from "./service";
import { collectionRoutes, itemRoutes } from "./routes";
import { listSchema } from "./validation";
import { ApiError } from "@/lib/api";

const entities = ["expenses", "income", "clients", "estimated-payments"] as const;
const tables = { expenses: mock.expense, income: mock.income, clients: mock.client, "estimated-payments": mock.estimatedPayment, invoices: mock.invoice };
const inputs = { expenses: { vendor: "Shop", date: "2026-06-01", amountCents: 10000, category: "MEALS", businessUsePercent: 75 }, income: { source: "Consulting", date: "2026-06-01", amountCents: 10000 }, clients: { name: "Client" }, "estimated-payments": { taxYear: 2026, quarter: 2, date: "2026-06-01", amountCents: 10000 } };
const invoiceInput = { clientId: "client1", issueDate: "2026-01-01", dueDate: "2026-01-15", items: [{ description: "Design", quantity: 2.5, unitPriceCents: 10000 }], discountCents: 1000, taxRateBasisPoints: 725 };
const invoiceRow = { ...invoiceInput, id: "invoice1", userId: "u1", number: "INV-0001", status: "SENT", issueDate: new Date("2026-01-01"), dueDate: new Date("2026-01-15"), paidAt: null, client: { id: "client1", name: "Client", company: null }, items: [{ ...invoiceInput.items[0], quantity: new Prisma.Decimal("2.5") }], subtotalCents: 25000, taxCents: 1740, totalCents: 25740 };
beforeEach(() => {
  vi.resetAllMocks(); vi.useRealTimers();
  mock.$transaction.mockImplementation(async work => work(mock));
  mock.requireUser.mockResolvedValue({ id: "u1" });
  mock.user.update.mockResolvedValue({ nextInvoiceNumber: 2 });
  for (const table of Object.values(tables)) {
    table.findMany.mockResolvedValue([]); table.count.mockResolvedValue(0); table.findFirst.mockResolvedValue({ id: "r1", userId: "u1", invoiceId: null });
    table.create.mockImplementation(async ({ data }) => ({ id: "r1", ...data }));
    table.update.mockImplementation(async ({ data }) => ({ id: "r1", ...data }));
  }
  mock.invoice.findFirst.mockResolvedValue(invoiceRow);
  mock.invoice.create.mockResolvedValue(invoiceRow);
});
describe("tenant-scoped services", () => {
  it.each(entities)("creates, reads, updates and deletes %s within the user boundary", async entity => {
    await createRecord(entity, "u1", inputs[entity]);
    expect(tables[entity].create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "u1" }) });
    await getRecord(entity, "u1", "r1");
    expect(tables[entity].findFirst).toHaveBeenLastCalledWith({ where: { userId: "u1", id: "r1" } });
    const patch = entity === "expenses" ? { vendor: "Updated" } : entity === "clients" ? { name: "Updated" } : { amountCents: 20000 };
    await updateRecord(entity, "u1", "r1", patch);
    expect(tables[entity].update).toHaveBeenCalledWith({ where: { id: "r1", userId: "u1" }, data: patch });
    await deleteRecord(entity, "u1", "r1");
    expect(tables[entity].delete).toHaveBeenCalledWith({ where: { id: "r1", userId: "u1" } });
    expect(mock.auditLog.create).toHaveBeenCalledWith({ data: { userId: "u1", action: "DELETE", entityType: entity, entityId: "r1" } });
    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mock.$queryRaw.mock.calls[0][1]).toBe("u1");
  });
  it.each([...entities, "invoices"] as Entity[])("scopes both rows and counts for %s", async entity => {
    await listRecords(entity, "u1", listSchema.parse({ search: "word", page: 2, pageSize: 10, from: "2026-01-01", to: "2026-12-31" }));
    expect(tables[entity].findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "u1", OR: expect.any(Array) }), skip: 10, take: 10 }));
    expect(tables[entity].count).toHaveBeenCalledWith({ where: expect.objectContaining({ userId: "u1" }) });
  });
  it("allowlists sort fields and implements category, dates, payment and derived-status filters", () => {
    expect(() => listOptions("expenses", "u1", listSchema.parse({ sort: "passwordHash" }))).toThrow("sort");
    expect(listOptions("expenses", "u1", listSchema.parse({ category: "MEALS" })).where.category).toBe("MEALS");
    expect(listOptions("estimated-payments", "u1", listSchema.parse({ year: 2026, quarter: 2 })).where).toEqual({ userId: "u1", taxYear: 2026, quarter: 2 });
    for (const status of ["SENT", "OVERDUE"] as const) expect(listOptions("invoices", "u1", listSchema.parse({ status }), "2026-06-15").where).toMatchObject({ status: { in: ["SENT", "OVERDUE"] }, dueDate: { [status === "SENT" ? "gte" : "lt"]: new Date("2026-06-15") } });
    expect(listOptions("invoices", "u1", listSchema.parse({ status: "PAID" })).where.status).toBe("PAID");
  });
  it("returns 404 without mutating or auditing another tenant's row", async () => {
    mock.expense.findFirst.mockResolvedValue(null);
    await expect(updateRecord("expenses", "u1", "foreign", { vendor: "Bad" })).rejects.toMatchObject({ status: 404 });
    await expect(deleteRecord("expenses", "u1", "foreign")).rejects.toMatchObject({ status: 404 });
    expect(mock.expense.update).not.toHaveBeenCalled(); expect(mock.expense.delete).not.toHaveBeenCalled(); expect(mock.auditLog.create).not.toHaveBeenCalled();
  });
  it("blocks direct changes to invoice-linked income", async () => {
    mock.income.findFirst.mockResolvedValue({ id: "r1", invoiceId: "invoice1" });
    await expect(updateRecord("income", "u1", "r1", { amountCents: 1 })).rejects.toMatchObject({ code: "LINKED_INCOME" });
    await expect(deleteRecord("income", "u1", "r1")).rejects.toMatchObject({ code: "LINKED_INCOME" });
    expect(mock.income.update).not.toHaveBeenCalled();
  });
  it("retries serialization conflicts and maps missing/in-use records", async () => {
    const error = (code: string) => new Prisma.PrismaClientKnownRequestError("db", { code, clientVersion: "7" });
    mock.$transaction.mockRejectedValueOnce(error("P2034"));
    expect(await write("u1", async () => "done")).toBe("done");
    for (const [code, apiCode] of [["P2003", "RECORD_IN_USE"], ["P2025", "NOT_FOUND"], ["P2034", "CONCURRENT_CHANGE"]]) {
      mock.$transaction.mockRejectedValue(error(code));
      await expect(write("u1", async () => "done")).rejects.toMatchObject({ code: apiCode });
    }
    mock.$transaction.mockRejectedValue(new Error("other"));
    await expect(write("u1", async () => "done")).rejects.toThrow("other");
  });
});
describe("transactional invoice lifecycle", () => {
  it("allocates a per-user sequence and writes calculated line items", async () => {
    await createRecord("invoices", "u1", invoiceInput);
    expect(mock.client.findFirst).toHaveBeenCalledWith({ where: { id: "client1", userId: "u1" } });
    expect(mock.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" }, data: { nextInvoiceNumber: { increment: 1 } } }));
    expect(mock.invoice.create.mock.calls[0][0].data).toMatchObject({ number: "INV-0001", userId: "u1", subtotalCents: 25000, taxCents: 1740, totalCents: 25740 });
    expect(mock.invoiceItem.createMany.mock.calls[0][0].data[0]).toMatchObject({ userId: "u1", invoiceId: "invoice1", amountCents: 25000 });
  });
  it("rejects a foreign client and inverted dates before allocating a number", async () => {
    mock.client.findFirst.mockResolvedValue(null);
    await expect(createRecord("invoices", "u1", invoiceInput)).rejects.toMatchObject({ status: 404 });
    await expect(createRecord("invoices", "u1", { ...invoiceInput, dueDate: "2025-12-01" })).rejects.toMatchObject({ code: "INVALID_DATES" });
    expect(mock.user.update).not.toHaveBeenCalled();
  });
  it("marks paid idempotently using the full discounted/taxed total and scoped income upsert", async () => {
    await updateRecord("invoices", "u1", "invoice1", { status: "PAID", paidAt: "2026-06-01" });
    expect(mock.invoice.update.mock.calls[0][0]).toMatchObject({ where: { id: "invoice1", userId: "u1" }, data: { status: "PAID", totalCents: 25740, paidAt: new Date("2026-06-01") } });
    expect(mock.income.upsert.mock.calls[0][0]).toMatchObject({ where: { invoiceId_userId: { invoiceId: "invoice1", userId: "u1" } }, create: { userId: "u1", invoiceId: "invoice1", amountCents: 25740 }, update: { amountCents: 25740 } });
    mock.invoice.findFirst.mockResolvedValue({ ...invoiceRow, status: "PAID", paidAt: new Date("2026-06-01") });
    await updateRecord("invoices", "u1", "invoice1", { status: "PAID" });
    expect(mock.income.upsert).toHaveBeenCalledTimes(2);
    await updateRecord("invoices", "u1", "invoice1", { status: "SENT" });
    expect(mock.income.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: "invoice1", userId: "u1" } });
  });
  it("replaces items on editable invoices and keeps computed totals", async () => {
    await updateRecord("invoices", "u1", "invoice1", { items: [{ description: "New", quantity: 1, unitPriceCents: 50000 }] });
    expect(mock.invoiceItem.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: "invoice1", userId: "u1" } });
    expect(mock.invoice.update.mock.calls[0][0].data).toMatchObject({ subtotalCents: 50000, taxCents: 3553, totalCents: 52553 });
  });
  it("locks paid or void contents, validates payment dates, and audits invoice deletes", async () => {
    mock.invoice.findFirst.mockResolvedValue({ ...invoiceRow, status: "PAID" });
    await expect(updateRecord("invoices", "u1", "invoice1", { notes: "Edited" })).rejects.toMatchObject({ code: "INVOICE_LOCKED" });
    mock.invoice.findFirst.mockResolvedValue(invoiceRow);
    await expect(updateRecord("invoices", "u1", "invoice1", { paidAt: "2026-06-01" })).rejects.toMatchObject({ code: "INVALID_PAYMENT_DATE" });
    await expect(updateRecord("invoices", "u1", "invoice1", { status: "PAID", paidAt: "2099-01-01" })).rejects.toMatchObject({ code: "INVALID_PAYMENT_DATE" });
    await deleteRecord("invoices", "u1", "invoice1");
    expect(mock.income.deleteMany).toHaveBeenCalledWith({ where: { invoiceId: "invoice1", userId: "u1" } });
    expect(mock.invoice.delete).toHaveBeenCalledWith({ where: { id: "invoice1", userId: "u1" } });
    expect(mock.auditLog.create).toHaveBeenCalled();
  });
});
describe("authenticated domain routes", () => {
  const request = (method = "GET", body?: unknown, suffix = "") => new Request(`http://localhost/api/expenses${suffix}`, { method, headers: { origin: "http://localhost", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  it("handles collection and item CRUD with no-store responses", async () => {
    vi.stubEnv("APP_URL", "http://localhost");
    const c = collectionRoutes("expenses"), i = itemRoutes("expenses"), ctx = { params: Promise.resolve({ id: "r1" }) };
    expect((await c.GET(request())).status).toBe(200);
    expect((await c.POST(request("POST", inputs.expenses))).status).toBe(201);
    expect((await i.GET(request(), ctx)).headers.get("cache-control")).toBe("no-store");
    expect((await i.PATCH(request("PATCH", { vendor: "New" }), ctx)).status).toBe(200);
    expect((await i.DELETE(request("DELETE"), ctx)).status).toBe(200);
    expect((await c.POST(request("POST", { ...inputs.expenses, userId: "foreign" }))).status).toBe(400);
    expect((await c.GET(request("GET", undefined, "?page=0"))).status).toBe(400);
    vi.unstubAllEnvs();
  });
  it("rejects unauthenticated users and invalid origins", async () => {
    vi.stubEnv("APP_URL", "http://localhost");
    mock.requireUser.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Sign in."));
    expect((await collectionRoutes("expenses").GET(request())).status).toBe(401);
    expect((await collectionRoutes("expenses").POST(new Request("http://localhost/api/expenses", { method: "POST" }))).status).toBe(403);
    vi.unstubAllEnvs();
  });
});
