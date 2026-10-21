import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ receipt: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn(), deleteMany: vi.fn() }, auditLog: { create: vi.fn() }, $queryRaw: vi.fn(), $transaction: vi.fn(), requireUser: vi.fn(), recognize: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
vi.mock("./ocr", () => ({ recognizeReceipt: mock.recognize }));
import { scanReceipt, getReceipt, discardReceipt } from "./routes";
import { ApiError } from "@/lib/errors";
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function scan(origin = "http://localhost") { const form = new FormData(); form.set("image", new File([png], "receipt.png", { type: "image/png" })); return new Request("http://localhost/api/receipts/scan", { method: "POST", headers: { origin }, body: form }); }
const context = { params: Promise.resolve({ id: "r1" }) };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost");
  mock.requireUser.mockResolvedValue({ id: "u1" }); mock.recognize.mockResolvedValue("DELL\n2026-06-16\nTOTAL 311.04");
  mock.$transaction.mockImplementation(async work => work(mock));
  mock.receipt.count.mockResolvedValue(0); mock.receipt.create.mockResolvedValue({ id: "r1" });
  mock.receipt.deleteMany.mockResolvedValue({ count: 1 }); mock.receipt.findFirst.mockResolvedValue({ image: png, mimeType: "image/png", size: png.length });
});
afterEach(() => vi.unstubAllEnvs());
describe("receipt API boundary", () => {
  it("scans one image and stores only the owner's pending receipt", async () => {
    const response = await scanReceipt(scan()); expect(response.status).toBe(201);
    expect((await response.json()).data).toMatchObject({ receiptId: "r1", totalCents: 31104, vendor: "DELL" });
    expect(mock.receipt.create).toHaveBeenCalledWith({ data: { image: png, mimeType: "image/png", size: 8, userId: "u1" }, select: { id: true } });
    expect(mock.receipt.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", expenseId: null, createdAt: { lt: expect.any(Date) } } });
  });
  it("returns private owner-only image bytes and discards only unattached receipts", async () => {
    const response = await getReceipt(new Request("http://localhost/api/receipts/r1"), context); expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mock.receipt.findFirst).toHaveBeenCalledWith({ where: { id: "r1", userId: "u1" } });
    expect((await discardReceipt(new Request("http://localhost/api/receipts/r1", { method: "DELETE", headers: { origin: "http://localhost" } }), context)).status).toBe(200);
    expect(mock.receipt.deleteMany).toHaveBeenCalledWith({ where: { id: "r1", userId: "u1", expenseId: null } });
    expect(mock.auditLog.create).toHaveBeenCalled();
    mock.receipt.findFirst.mockResolvedValue(null); mock.receipt.deleteMany.mockResolvedValue({ count: 0 });
    expect((await getReceipt(new Request("http://localhost"), context)).status).toBe(404);
    expect((await discardReceipt(new Request("http://localhost", { method: "DELETE", headers: { origin: "http://localhost" } }), context)).status).toBe(404);
  });
  it("rejects unauthorized/origin-invalid uploads, OCR failures and excessive pending receipts", async () => {
    expect((await scanReceipt(scan("https://foreign.example"))).status).toBe(403); expect(mock.recognize).not.toHaveBeenCalled();
    mock.requireUser.mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Sign in")); expect((await scanReceipt(scan())).status).toBe(401);
    mock.recognize.mockRejectedValueOnce(new ApiError(504, "OCR_TIMEOUT", "Timed out")); expect((await scanReceipt(scan())).status).toBe(504); expect(mock.receipt.create).not.toHaveBeenCalled();
    mock.receipt.count.mockResolvedValue(10); expect((await scanReceipt(scan())).status).toBe(409); expect(mock.receipt.create).not.toHaveBeenCalled();
  });
});
