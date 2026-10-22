import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ notification: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() }, requireUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mock }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mock.requireUser }));
import { GET as list } from "@/app/api/notifications/route";
import { PATCH as markRead } from "@/app/api/notifications/[id]/route";
import { ApiError } from "@/lib/errors";
const ctx = { params: Promise.resolve({ id: "foreign" }) };
const req = (body: unknown = { read: true }, origin = "http://localhost") => new Request("http://localhost/api/notifications/foreign", { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("APP_URL", "http://localhost");
  mock.requireUser.mockResolvedValue({ id: "owner" }); mock.notification.findMany.mockResolvedValue([]); mock.notification.count.mockResolvedValue(0);
});
afterEach(() => vi.unstubAllEnvs());
describe("tenant-scoped notifications", () => {
  it("limits the dropdown to owner rows and counts all owner unread notifications", async () => {
    const response = await list(new Request("http://localhost/api/notifications")); expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mock.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" }, take: 50 }));
    expect(mock.notification.count).toHaveBeenCalledWith({ where: { userId: "owner", readAt: null } });
  });
  it("cannot read or update another tenant's notification and preserves the first read time", async () => {
    mock.notification.findFirst.mockResolvedValue(null);
    expect((await markRead(req(), ctx)).status).toBe(404); expect(mock.notification.updateMany).not.toHaveBeenCalled();
    expect(mock.notification.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "owner" }, select: { id: true } });
    mock.notification.findFirst.mockResolvedValue({ id: "foreign" });
    expect((await markRead(req(), ctx)).status).toBe(200);
    expect(mock.notification.updateMany).toHaveBeenCalledWith({ where: { id: "foreign", userId: "owner", readAt: null }, data: { readAt: expect.any(Date) } });
  });
  it("requires authentication, same origin and strict mark-read validation", async () => {
    expect((await markRead(req({}, "https://foreign.example"), ctx)).status).toBe(403);
    for (const body of [{ read: false }, { read: true, userId: "foreign" }, {}]) expect((await markRead(req(body), ctx)).status).toBe(400);
    mock.requireUser.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Sign in"));
    expect((await list(new Request("http://localhost/api/notifications"))).status).toBe(401);
    expect((await markRead(req(), ctx)).status).toBe(401); expect(mock.notification.updateMany).not.toHaveBeenCalled();
  });
});
