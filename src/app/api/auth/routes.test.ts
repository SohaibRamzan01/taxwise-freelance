import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), createUser: vi.fn(), createAudit: vi.fn(), transaction: vi.fn(),
  hash: vi.fn(), verify: vi.fn(), sign: vi.fn(), getSessionUser: vi.fn(), requireUser: vi.fn(), limit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique, create: mocks.createUser }, auditLog: { create: mocks.createAudit }, $transaction: mocks.transaction } }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: mocks.hash, verifyPassword: mocks.verify, getDummyPasswordHash: async () => "dummy-hash" }));
vi.mock("@/lib/auth/token", () => ({ SESSION_COOKIE: "taxwise_session", signSession: mocks.sign, sessionCookieOptions: () => ({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 604800 }) }));
vi.mock("@/lib/auth/session", () => ({ getSessionUser: mocks.getSessionUser, requireUser: mocks.requireUser, sessionUserSelect: { id: true, name: true, email: true, role: true, isActive: true } }));
vi.mock("@/lib/auth/rate-limit", () => ({ limitAuth: mocks.limit }));

import { POST as signup } from "./signup/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as me } from "./me/route";

const user = { id: "u1", name: "Alex", email: "alex@example.com", role: "USER", isActive: true };
const input = { email: user.email, password: "long-test-password", name: user.name };
afterEach(() => vi.unstubAllEnvs());
function request(path: string, body: unknown = input) {
  return new Request(`http://localhost:3000/api/auth/${path}`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  mocks.hash.mockResolvedValue("hashed-password");
  mocks.verify.mockResolvedValue(true);
  mocks.sign.mockResolvedValue("signed-test-token");
  mocks.createUser.mockResolvedValue(user);
  mocks.findUnique.mockResolvedValue({ ...user, passwordHash: "hashed-password" });
  mocks.getSessionUser.mockResolvedValue(user);
  mocks.requireUser.mockResolvedValue(user);
  mocks.transaction.mockImplementation(async callback => callback({ user: { create: mocks.createUser }, auditLog: { create: mocks.createAudit } }));
});

describe("auth routes", () => {
  it("signs up, audits, and issues a protected cookie without exposing password hashes", async () => {
    const response = await signup(request("signup", { ...input, role: "ADMIN" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ user });
    expect(mocks.createUser.mock.calls[0][0].data).toMatchObject({ role: "USER", passwordHash: "hashed-password" });
    expect(mocks.limit).toHaveBeenCalledWith(expect.any(Request), user.email, "signup");
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: { userId: "u1", action: "SIGNUP", entityType: "User", entityId: "u1" } });
    const cookie = response.headers.get("set-cookie");
    for (const flag of ["HttpOnly", "Secure", "SameSite=lax", "Max-Age=604800", "Path=/"]) expect(cookie).toContain(flag);
  });
  it("promotes configured admin emails only", async () => {
    await signup(request("signup", { ...input, email: "ADMIN@EXAMPLE.COM" }));
    expect(mocks.createUser.mock.calls[0][0].data).toMatchObject({ email: "admin@example.com", role: "ADMIN" });
  });
  it("handles duplicate accounts and validation errors with the shared envelope", async () => {
    mocks.createUser.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique conflict", { code: "P2002", clientVersion: "7" }));
    const duplicate = await signup(request("signup"));
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).error.code).toBe("EMAIL_UNAVAILABLE");
    const invalid = await signup(request("signup", { ...input, password: "short" }));
    expect(invalid.status).toBe(400);
  });
  it("logs in with a safe user projection and an audit record", async () => {
    const response = await login(request("login"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user });
    expect(mocks.verify).toHaveBeenCalledWith(input.password, "hashed-password");
    expect(mocks.createAudit.mock.calls[0][0].data.action).toBe("LOGIN");
  });
  it("returns the same error for unknown, inactive, and incorrect-password accounts", async () => {
    const bodies = [];
    mocks.findUnique.mockResolvedValueOnce(null);
    let response = await login(request("login"));
    expect(response.status).toBe(401);
    expect(mocks.verify).toHaveBeenLastCalledWith(input.password, "dummy-hash");
    bodies.push(await response.json());
    mocks.findUnique.mockResolvedValueOnce({ ...user, passwordHash: "hashed-password", isActive: false });
    response = await login(request("login"));
    expect(response.status).toBe(401);
    bodies.push(await response.json());
    mocks.verify.mockResolvedValueOnce(false);
    response = await login(request("login"));
    expect(response.status).toBe(401);
    bodies.push(await response.json());
    expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[1]).toEqual(bodies[2]);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.createAudit).not.toHaveBeenCalled();
  });
  it("audits logout and clears the session even when no active session exists", async () => {
    const response = await logout(request("logout", {}));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(mocks.createAudit.mock.calls[0][0].data.action).toBe("LOGOUT");
    mocks.getSessionUser.mockResolvedValueOnce(null);
    expect((await logout(request("logout", {}))).status).toBe(200);
    expect(mocks.createAudit).toHaveBeenCalledTimes(1);
  });
  it("returns the authenticated user from me", async () => {
    const response = await me(new Request("http://localhost:3000/api/auth/me"));
    expect(await response.json()).toEqual({ user });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
