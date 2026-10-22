import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verify = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/token", () => ({ SESSION_COOKIE: "taxwise_session", verifySession: verify }));
import { config, proxy } from "./proxy";

beforeEach(() => vi.resetAllMocks());
describe("protected route proxy", () => {
  it("includes the estimated payment workspace in the protected matcher", () => {
    expect(config.matcher).toContain("/estimated-payments/:path*");
  });
  it("redirects missing or invalid sessions to login with a return path", async () => {
    let response = await proxy(new NextRequest("http://localhost/expenses"));
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fexpenses");
    verify.mockResolvedValue(null);
    response = await proxy(new NextRequest("http://localhost/invoices", { headers: { cookie: "taxwise_session=bad" } }));
    expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Finvoices");
  });
  it("allows signed-in users through to server guards regardless of a stale JWT role", async () => {
    verify.mockResolvedValue({ userId: "u1", role: "USER" });
    const request = (path: string) => new NextRequest(`http://localhost${path}`, { headers: { cookie: "taxwise_session=token" } });
    expect((await proxy(request("/dashboard"))).headers.get("x-middleware-next")).toBe("1");
    expect((await proxy(request("/admin"))).headers.get("x-middleware-next")).toBe("1");
    verify.mockResolvedValue({ userId: "u1", role: "ADMIN" });
    expect((await proxy(request("/admin"))).headers.get("x-middleware-next")).toBe("1");
  });
});
