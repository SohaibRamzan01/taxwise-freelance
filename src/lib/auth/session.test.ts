import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), verify: vi.fn(), findUnique: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("./token", () => ({ SESSION_COOKIE: "taxwise_session", verifySession: mocks.verify }));

import { getSessionUser, requireUser, requireAdmin } from "./session";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockReturnValue({ value: "token" });
  mocks.verify.mockResolvedValue({ userId: "owner-1", role: "ADMIN" });
});

describe("session authorization", () => {
  it("does not query the database for missing or invalid sessions", async () => {
    mocks.get.mockReturnValue(undefined);
    expect(await getSessionUser()).toBeNull();
    mocks.get.mockReturnValue({ value: "bad-token" });
    mocks.verify.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("scopes the user lookup to the signed subject and excludes passwords", async () => {
    const user = { id: "owner-1", name: "Alex", email: "alex@example.com", isActive: true, role: "USER" };
    mocks.findUnique.mockResolvedValue(user);
    expect(await requireUser()).toEqual(user);
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: "owner-1" }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  });
  it("blocks deactivated and deleted users despite a valid JWT", async () => {
    mocks.findUnique.mockResolvedValue({ id: "owner-1", isActive: false });
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
    mocks.findUnique.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it("uses the current database role instead of a stale JWT role", async () => {
    mocks.findUnique.mockResolvedValue({ id: "owner-1", isActive: true, role: "USER" });
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
    mocks.verify.mockResolvedValue({ userId: "owner-1", role: "USER" });
    mocks.findUnique.mockResolvedValue({ id: "owner-1", isActive: true, role: "ADMIN" });
    expect(await requireAdmin()).toMatchObject({ role: "ADMIN" });
  });
});
