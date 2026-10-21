import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: { findUnique: vi.fn(), update: vi.fn() }, income: { findMany: vi.fn() }, expense: { findMany: vi.fn() }, estimatedPayment: { findMany: vi.fn() }, invoice: { findMany: vi.fn() }, requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
import { dashboard, getSettings, profileSelect, taxSummary, updateSettings } from "./summary";
import { GET as getEstimate } from "@/app/api/tax/estimate/route";
import { GET as getDashboard } from "@/app/api/dashboard/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/settings/route";
const profile = { taxYear: 2026, filingStatus: "SINGLE", priorYearTaxCents: 0, priorYearAgiCents: 0, useSafeHarbour: false, currency: "USD" };
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
  mock.requireUser.mockResolvedValue({ id: "u1" }); mock.user.findUnique.mockResolvedValue(profile); mock.user.update.mockResolvedValue(profile);
  mock.income.findMany.mockResolvedValue([{ date: new Date("2026-06-01"), amountCents: 10000000 }]);
  mock.expense.findMany.mockResolvedValue([{ date: new Date("2026-06-02"), amountCents: 1000000, category: "MEALS", businessUsePercent: 80 }]);
  mock.estimatedPayment.findMany.mockResolvedValue([{ date: new Date("2026-06-15"), amountCents: 10000, quarter: 2 }]);
  mock.invoice.findMany.mockResolvedValue([{ id: "i1", status: "SENT", dueDate: new Date("2026-01-15"), totalCents: 10000, client: { name: "Client" } }]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("tax and dashboard aggregation", () => {
  it("queries only the session user's YTD ledger and tax-year payments", async () => {
    const result = await taxSummary("u1", { annualise: false });
    expect(result.estimate).toMatchObject({ incomeCents: 10000000, deductionsCents: 400000, netProfitCents: 9600000, annualised: false });
    const where = { userId: "u1", date: { gte: new Date("2026-01-01"), lt: new Date("2026-10-23") } };
    expect(mock.income.findMany).toHaveBeenCalledWith({ where }); expect(mock.expense.findMany).toHaveBeenCalledWith({ where });
    expect(mock.estimatedPayment.findMany).toHaveBeenCalledWith({ where: { userId: "u1", taxYear: 2026, date: { lte: new Date("2026-10-22") } } });
    expect(result.schedule.paidSoFarCents).toBe(10000);
  });
  it("supports historical as-of snapshots without including the next tax year", async () => {
    await taxSummary("u1", { asOf: "2026-06-15" });
    expect(mock.income.findMany.mock.calls[0][0].where.date.lt).toEqual(new Date("2026-06-16"));
    vi.setSystemTime(new Date("2027-01-20"));
    await taxSummary("u1");
    expect(mock.income.findMany.mock.calls[1][0].where.date.lt).toEqual(new Date("2027-01-01"));
  });
  it("rejects unsupported years, missing profiles and future dates", async () => {
    await expect(taxSummary("u1", { year: 2025 })).rejects.toMatchObject({ code: "UNSUPPORTED_YEAR" });
    await expect(taxSummary("u1", { asOf: "2026-12-01" })).rejects.toMatchObject({ code: "INVALID_AS_OF" });
    await expect(taxSummary("u1", { asOf: "2025-12-31" })).rejects.toMatchObject({ code: "INVALID_AS_OF" });
    mock.user.findUnique.mockResolvedValue(null);
    await expect(getSettings("u1")).rejects.toMatchObject({ status: 404 });
  });
  it("builds 12 monthly buckets, category deductions, derived invoice statuses and deadlines", async () => {
    const result = await dashboard("u1");
    expect(result.kpis).toMatchObject({ incomeCents: 10000000, expenseCents: 1000000, deductionsCents: 400000, outstandingCents: 10000, nextDueDate: "2027-01-15" });
    expect(result.monthly).toHaveLength(12);
    expect(result.monthly[5]).toEqual({ month: "Jun", incomeCents: 10000000, expenseCents: 1000000 });
    expect(result.deductions).toEqual([{ category: "MEALS", label: "Meals", amountCents: 400000 }]);
    expect(result.outstandingInvoices[0].status).toBe("OVERDUE");
    expect(result.upcomingDeadlines.map(q => q.quarter)).toEqual([1, 2, 3, 4]);
    expect(mock.invoice.findMany.mock.calls[0][0].where).toMatchObject({ userId: "u1" });
  });
  it("updates only allowed profile fields and never returns password or invoice counter fields", async () => {
    await updateSettings("u1", { filingStatus: "HEAD_OF_HOUSEHOLD", businessName: "Studio" });
    expect(mock.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { filingStatus: "HEAD_OF_HOUSEHOLD", businessName: "Studio" }, select: profileSelect });
    await expect(updateSettings("u1", { passwordHash: "bad" })).rejects.toThrow();
    expect(profileSelect).not.toHaveProperty("passwordHash"); expect(profileSelect).not.toHaveProperty("nextInvoiceNumber");
  });
  it("serves validated estimate, dashboard and profile routes", async () => {
    vi.stubEnv("APP_URL", "http://localhost");
    const req = (path: string) => new Request(`http://localhost/api/${path}`);
    expect((await getEstimate(req("tax/estimate?year=2026&annualise=false"))).status).toBe(200);
    expect((await getEstimate(req("tax/estimate?year=2025"))).status).toBe(400);
    expect((await getDashboard(req("dashboard"))).status).toBe(200);
    expect((await getProfile(req("settings"))).status).toBe(200);
    expect((await patchProfile(new Request("http://localhost/api/settings", { method: "PATCH", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ businessName: "Studio" }) }))).status).toBe(200);
  });
});
