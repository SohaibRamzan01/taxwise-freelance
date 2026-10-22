import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe("deployment security configuration", () => {
  it.each(["production", "development"])("sets restrictive headers for %s", async mode => {
    vi.stubEnv("NODE_ENV", mode); vi.resetModules();
    const { default: config } = await import("../next.config");
    const entries = await config.headers!();
    const headers = Object.fromEntries(entries[0].headers.map(h => [h.key, h.value]));
    expect(headers).toMatchObject({ "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" });
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"].includes("'unsafe-eval'")).toBe(mode === "development");
    expect(Boolean(headers["Strict-Transport-Security"])).toBe(mode === "production");
    expect(config.poweredByHeader).toBe(false);
  });
  it("keeps the cron daily and includes worker, WASM, language and font trace patterns", async () => {
    const cron = JSON.parse(await readFile("vercel.json", "utf8"));
    expect(cron.crons).toEqual([{ path: "/api/cron/daily", schedule: "0 6 * * *" }]);
    const { default: config } = await import("../next.config");
    expect(config.outputFileTracingIncludes?.["/api/receipts/scan"]).toEqual(expect.arrayContaining([
      "./node_modules/tesseract.js/src/**/*", "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/eng/package.json", "./node_modules/@tesseract.js-data/eng/4.0.0/*",
      "./node_modules/bmp-js/**/*.js", "./node_modules/bmp-js/package.json",
      "./node_modules/wasm-feature-detect/dist/cjs/*", "./node_modules/wasm-feature-detect/package.json",
    ]));
    for (const pattern of ["/api/invoices/*/pdf", "/api/reports/*"]) expect(config.outputFileTracingIncludes?.[pattern]).toContain("./node_modules/pdfkit/js/data/*");
  });
});
