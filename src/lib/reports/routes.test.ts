import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: { findUnique: vi.fn() }, income: { findMany: vi.fn() }, expense: { findMany: vi.fn() }, estimatedPayment: { findMany: vi.fn() }, invoice: { findFirst: vi.fn() }, requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
import { GET } from "@/app/api/reports/tax-summary/route";
import { GET as invoicePdf } from "@/app/api/invoices/[id]/pdf/route";
import { ApiError } from "@/lib/errors";
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  mock.requireUser.mockResolvedValue({ id: "u1", name: "Alex", email: "alex@example.test" });
  mock.user.findUnique.mockResolvedValue({ filingStatus: "SINGLE", taxYear: 2026, priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false });
  mock.income.findMany.mockResolvedValue([{ date: new Date("2026-06-01"), amountCents: 1000000 }]); mock.expense.findMany.mockResolvedValue([]); mock.estimatedPayment.findMany.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());
const request = (q = "") => new Request(`http://localhost/api/reports/tax-summary${q}`);
describe("reports API", () => {
  it("scopes all inputs by session tenant, validates periods and offers JSON/CSV/PDF", async () => {
    const json = await GET(request("?year=2026&quarter=2&format=json")); expect(json.status).toBe(200); expect((await json.json()).data.incomeCents).toBe(1000000);
    for (const table of [mock.income, mock.expense]) expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", date: { gte: new Date("2026-01-01"), lt: new Date("2027-01-01"), lte: new Date("2026-10-22") } } }));
    expect(mock.estimatedPayment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", taxYear: 2026, date: { lte: new Date("2026-10-22") } } }));
    const csv = await GET(request("?quarter=&format=csv")); expect(csv.headers.get("content-type")).toContain("text/csv"); expect(await csv.text()).toContain("Schedule C line");
    // Restore native timers for PDFKit stream delivery.
    vi.useRealTimers();
    const pdf = await GET(request()); expect(pdf.headers.get("content-type")).toBe("application/pdf"); expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
    for (const q of ["?year=2025", "?quarter=5", "?format=html", "?userId=foreign"]) expect((await GET(request(q))).status).toBe(400);
  });
  it("requires authentication and returns missing invoices without exposing tenant data", async () => {
    mock.requireUser.mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Sign in")); expect((await GET(request())).status).toBe(401);
    mock.invoice.findFirst.mockResolvedValue(null);
    expect((await invoicePdf(new Request("http://localhost/api/invoices/foreign/pdf"), { params: Promise.resolve({ id: "foreign" }) })).status).toBe(404);
    expect(mock.invoice.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "u1" }, include: { client: true, items: { orderBy: { position: "asc" } } } });
  });
});
