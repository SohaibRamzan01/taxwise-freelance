import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categorizeExpense } from ".";
const fetchMock = vi.fn();
const input = { vendor: "Adobe", description: "Design tools", amount: 2999 };
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
const envelope = (value: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] });
describe("expense AI boundary", () => {
  it("skips the network without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await categorizeExpense(input)).toEqual({ category: "SOFTWARE_AND_SUBSCRIPTIONS", confidence: .95, source: "rules" }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requests structured Gemini JSON with bounded inputs and validates a successful result", async () => {
    fetchMock.mockResolvedValue(Response.json(envelope({ category: "SOFTWARE_AND_SUBSCRIPTIONS", confidence: .9 })));
    expect(await categorizeExpense(input)).toEqual({ category: "SOFTWARE_AND_SUBSCRIPTIONS", confidence: .9, source: "ai" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-2.5-flash:generateContent"); expect(url).not.toContain("test-key");
    const body = JSON.parse(options.body);
    expect(body.generationConfig.responseJsonSchema).toMatchObject({ type: "object", additionalProperties: false, required: ["category", "confidence"] });
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
  });
  it.each([null, {}, { category: "INVALID", confidence: .9 }, { category: "MEALS", confidence: 2 }, { category: "MEALS", confidence: -.1 }, { category: "MEALS", confidence: .8, extra: "untrusted" }])("falls back for invalid provider output %j", async value => {
    fetchMock.mockResolvedValue(Response.json(envelope(value)));
    expect((await categorizeExpense(input)).source).toBe("rules");
  });
  it("falls back on network, HTTP, malformed JSON and blocked responses", async () => {
    for (const response of [new Error("offline"), new Response("busy", { status: 429 }), new Response("not json"), Response.json({ candidates: [] }), Response.json({ candidates: [{ content: { parts: [{ text: "not json" }] } }] })]) {
      if (response instanceof Error) fetchMock.mockRejectedValueOnce(response); else fetchMock.mockResolvedValueOnce(response);
      expect((await categorizeExpense(input)).source).toBe("rules");
    }
  });
  it.each(["fetch", "body"])("returns rules within five seconds when %s hangs", async stage => {
    vi.useFakeTimers(); let signal: AbortSignal;
    fetchMock.mockImplementation((_url, options) => { signal = options.signal; return stage === "fetch" ? new Promise(() => {}) : Promise.resolve({ ok: true, json: () => new Promise(() => {}) }); });
    const work = categorizeExpense(input); await vi.advanceTimersByTimeAsync(5000);
    expect((await work).source).toBe("rules"); expect(signal!.aborted).toBe(true);
  });
  it("rejects invalid input before sending anything", async () => {
    await expect(categorizeExpense({ ...input, amount: -1 })).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([["AWS", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Amazon Web Services", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Adobe", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Zoom", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Uber", "TRAVEL"], ["Delta", "TRAVEL"], ["WeWork", "RENT_AND_LEASE"], ["Upwork fees", "LEGAL_AND_PROFESSIONAL"], ["Upwork", "CONTRACT_LABOR"], ["Unknown vendor", "OTHER"]])("covers vendor %s without AI", async (vendor, category) => {
    vi.stubEnv("GEMINI_API_KEY", ""); expect(await categorizeExpense({ ...input, vendor })).toMatchObject({ category, source: "rules" });
  });
});
