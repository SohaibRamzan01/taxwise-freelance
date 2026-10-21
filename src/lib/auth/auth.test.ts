import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { BCRYPT_COST, hashPassword, verifyPassword } from "./password";
import { SESSION_SECONDS, sessionCookieOptions, signSession, verifySession } from "./token";
import { loginSchema, signupRole, signupSchema } from "./validation";
import { RateLimiter, limitAuth } from "./rate-limit";

const testSecret = "test-only-secret-with-at-least-32-bytes";
beforeEach(() => vi.stubEnv("JWT_SECRET", testSecret));
afterEach(() => vi.unstubAllEnvs());

describe("passwords", () => {
  it("salts passwords at bcrypt cost 12 and verifies without accepting a wrong password", async () => {
    const hash = await hashPassword("a long test password");
    expect(hash).not.toContain("a long test password");
    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    expect(await verifyPassword("a long test password", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });
});

describe("session tokens", () => {
  it("round trips a signed token with a seven-day expiry", async () => {
    const token = await signSession({ userId: "user-123", role: "USER" });
    expect(await verifySession(token)).toEqual({ userId: "user-123", role: "USER" });
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    expect(payload.exp - payload.iat).toBe(SESSION_SECONDS);
    expect(payload).not.toHaveProperty("passwordHash");
  });
  it("rejects tampering and a different signing secret", async () => {
    const token = await signSession({ userId: "u1", role: "ADMIN" });
    const [header, payload, signature] = token.split(".");
    const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sub: "another-user" })).toString("base64url");
    expect(await verifySession(`${header}.${changed}.${signature}`)).toBeNull();
    vi.stubEnv("JWT_SECRET", "a-different-test-only-secret-of-32-bytes");
    expect(await verifySession(token)).toBeNull();
  });
  it("rejects expired tokens, wrong algorithms, invalid roles, and missing subjects", async () => {
    for (const options of [
      { role: "USER", sub: "u1", alg: "HS256", exp: "-1s" },
      { role: "USER", sub: "u1", alg: "HS384", exp: "1h" },
      { role: "SUPERUSER", sub: "u1", alg: "HS256", exp: "1h" },
      { role: "USER", sub: "", alg: "HS256", exp: "1h" },
    ]) {
      const token = await new SignJWT({ role: options.role }).setProtectedHeader({ alg: options.alg }).setSubject(options.sub).setIssuer("taxwise").setAudience("taxwise-app").setIssuedAt().setExpirationTime(options.exp).sign(new TextEncoder().encode(testSecret));
      expect(await verifySession(token)).toBeNull();
    }
    expect(await verifySession("not-a-token")).toBeNull();
  });
  it("fails closed when the signing secret is missing or too short", async () => {
    for (const value of ["", "too-short"]) {
      vi.stubEnv("JWT_SECRET", value);
      await expect(verifySession("anything")).rejects.toThrow("JWT_SECRET");
      expect(() => signSession({ userId: "u1", role: "USER" })).toThrow("JWT_SECRET");
    }
  });
  it("sets httpOnly, sameSite, path, expiry, and production Secure cookies", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookieOptions().secure).toBe(false);
  });
});

describe("auth validation", () => {
  it("normalizes email and name and ignores submitted roles", () => {
    expect(signupSchema.parse({ name: "  Alex Morgan ", email: " ALEX@EXAMPLE.COM ", password: "long-enough-password", role: "ADMIN" })).toEqual({ name: "Alex Morgan", email: "alex@example.com", password: "long-enough-password" });
  });
  it("rejects weak passwords and bcrypt UTF-8 truncation", () => {
    const input = { name: "Alex", email: "alex@example.com" };
    expect(signupSchema.safeParse({ ...input, password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: "😀".repeat(19) }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: "😀".repeat(18) }).success).toBe(true);
    expect(loginSchema.safeParse({ email: input.email, password: "a".repeat(73) }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false);
  });
  it("only promotes emails explicitly configured in ADMIN_EMAILS", () => {
    vi.stubEnv("ADMIN_EMAILS", " Admin@Example.com, second@example.com, ");
    expect(signupRole("admin@example.com")).toBe("ADMIN");
    expect(signupRole("other@example.com")).toBe("USER");
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(signupRole("admin@example.com")).toBe("USER");
  });
});

describe("rate limiting", () => {
  it("isolates keys and resets at the window boundary", () => {
    const limiter = new RateLimiter(2, 1000);
    expect(limiter.allow("ip:email", 0)).toBe(true);
    expect(limiter.allow("ip:email", 1)).toBe(true);
    expect(limiter.allow("ip:email", 999)).toBe(false);
    expect(limiter.allow("ip:other", 999)).toBe(true);
    expect(limiter.allow("ip:email", 1000)).toBe(true);
  });
  it("bounds memory and recovers after entries expire", () => {
    const limiter = new RateLimiter(1, 1000, 1);
    expect(limiter.allow("first", 0)).toBe(true);
    expect(limiter.allow("second", 1)).toBe(false);
    expect(limiter.allow("second", 1000)).toBe(true);
  });
  it("limits by IP plus email and separates login from signup", () => {
    const request = new Request("http://localhost/api/auth/login", { headers: { "x-forwarded-for": "192.0.2.10, 192.0.2.11" } });
    for (let index = 0; index < 10; index++) limitAuth(request, "rate-test@example.com", "login");
    expect(() => limitAuth(request, "rate-test@example.com", "login")).toThrow("Too many attempts");
    expect(() => limitAuth(request, "rate-test@example.com", "signup")).not.toThrow();
    expect(() => limitAuth(request, "another@example.com", "login")).not.toThrow();
  });
});
