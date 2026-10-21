import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, apiHandler, assertSameOrigin, errorResponse, parseJson } from "./api";

afterEach(() => vi.unstubAllEnvs());
describe("API utilities", () => {
  it("requires the configured origin on mutations, including logout", () => {
    vi.stubEnv("APP_URL", "https://taxwise.example");
    expect(() => assertSameOrigin(new Request("http://internal/api", { headers: { origin: "https://taxwise.example" } }))).not.toThrow();
    for (const origin of [undefined, "null", "https://attacker.example", "https://taxwise.example.attacker.example"]) {
      expect(() => assertSameOrigin(new Request("http://internal/api", { headers: origin ? { origin } : {} }))).toThrow("origin");
    }
  });
  it("validates JSON and rejects malformed, unsupported, or oversized payloads", async () => {
    const schema = z.object({ name: z.string() });
    const request = (body: string, type = "application/json") => new Request("http://localhost/api", { method: "POST", headers: { "content-type": type }, body });
    expect(await parseJson(request('{"name":"Alex"}'), schema)).toEqual({ name: "Alex" });
    await expect(parseJson(request("{bad"), schema)).rejects.toMatchObject({ status: 400 });
    await expect(parseJson(request("{}", "text/plain"), schema)).rejects.toMatchObject({ status: 415 });
    await expect(parseJson(request(JSON.stringify({ name: "a".repeat(17000) })), schema)).rejects.toMatchObject({ status: 413 });
    await expect(parseJson(request("{}"), schema)).rejects.toBeInstanceOf(z.ZodError);
  });
  it("maps validation errors and prevents internal error details leaking", async () => {
    const parsed = z.object({ name: z.string() }).safeParse({});
    if (parsed.success) throw new Error("Expected validation failure");
    const response = errorResponse(parsed.error);
    expect(response.status).toBe(400);
    expect((await response.json()).error.details.fieldErrors.name).toBeDefined();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const unexpected = errorResponse(new Error("database-password-sensitive"));
    expect(unexpected.status).toBe(500);
    expect(JSON.stringify(await unexpected.json())).not.toContain("sensitive");
    log.mockRestore();
  });
  it("applies origin protection, a consistent error envelope, and retry headers", async () => {
    vi.stubEnv("APP_URL", "http://localhost");
    const handler = apiHandler(async () => { throw new ApiError(429, "RATE_LIMITED", "Wait."); });
    const denied = await handler(new Request("http://localhost/api", { method: "POST" }));
    expect(denied.status).toBe(403);
    const limited = await handler(new Request("http://localhost/api", { method: "POST", headers: { origin: "http://localhost" } }));
    expect(limited.headers.get("Retry-After")).toBe("900");
    expect(limited.headers.get("Cache-Control")).toBe("no-store");
    expect(await limited.json()).toEqual({ error: { code: "RATE_LIMITED", message: "Wait." } });
    const get = apiHandler(async () => Response.json({ ok: true }));
    expect((await get(new Request("http://localhost/api"))).status).toBe(200);
  });
});
