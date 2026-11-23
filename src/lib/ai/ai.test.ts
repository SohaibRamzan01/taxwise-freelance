import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TIMEOUT_MS, categorizeExpense, DEFAULT_GEMINI_MODEL } from ".";
const fetchMock = vi.fn();
const input = { vendor: "Adobe", description: "Design tools", amount: 2999 };
let errorLog: ReturnType<typeof vi.spyOn>;
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test-key"); vi.stubEnv("GEMINI_MODEL", ""); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); errorLog = vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); errorLog.mockRestore(); });
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
    expect(url).toContain(`${DEFAULT_GEMINI_MODEL}:generateContent`); expect(url).not.toContain("test-key");
    const body = JSON.parse(options.body);
    expect(body.generationConfig.responseJsonSchema).toMatchObject({ type: "object", additionalProperties: false, required: ["category", "confidence"] });
    expect(body.generationConfig.responseJsonSchema).not.toHaveProperty("$schema");
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "low" });
    expect(JSON.stringify(body)).not.toContain("test-key");
    expect(options.headers["x-goog-api-key"]).toBe("test-key");
  });
  it("uses GEMINI_MODEL when set, with a thinking budget for 2.x models, and ignores unsafe names", async () => {
    fetchMock.mockResolvedValue(Response.json(envelope({ category: "MEALS", confidence: .8 })));
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    await categorizeExpense(input);
    expect(fetchMock.mock.calls[0][0]).toContain("/models/gemini-2.5-flash:generateContent");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    vi.stubEnv("GEMINI_MODEL", "../evil?x=1");
    await categorizeExpense(input);
    expect(fetchMock.mock.calls[1][0]).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
  });
  it("ignores thought parts and signature-only parts in the response", async () => {
    fetchMock.mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: "reasoning", thought: true }, { thoughtSignature: "abc" }, { text: JSON.stringify({ category: "TRAVEL", confidence: .85 }) }] } }] }));
    expect(await categorizeExpense(input)).toEqual({ category: "TRAVEL", confidence: .85, source: "ai" });
  });
  it("logs the provider status and message on failure without the key or expense contents", async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { status: "NOT_FOUND", message: "models/gemini-x is not found" } }, { status: 404 }));
    expect((await categorizeExpense(input)).source).toBe("rules");
    const logged = JSON.parse(String(errorLog.mock.calls[0][0]));
    expect(logged).toMatchObject({ event: "ai_categorize_error", reason: "http_error", status: 404, message: "NOT_FOUND: models/gemini-x is not found" });
    const raw = String(errorLog.mock.calls[0][0]);
    expect(raw).not.toContain("test-key"); expect(raw).not.toContain("Adobe"); expect(raw).not.toContain("Design tools");
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
  it.each(["fetch", "body"])("returns rules within the deadline when %s hangs", async stage => {
    vi.useFakeTimers(); let signal: AbortSignal;
    fetchMock.mockImplementation((_url, options) => { signal = options.signal; return stage === "fetch" ? new Promise(() => {}) : Promise.resolve({ ok: true, json: () => new Promise(() => {}) }); });
    const work = categorizeExpense(input); await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
    expect((await work).source).toBe("rules"); expect(signal!.aborted).toBe(true);
  });
  it("rejects invalid input before sending anything", async () => {
    await expect(categorizeExpense({ ...input, amount: -1 })).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([["AWS", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Amazon Web Services", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Adobe", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Zoom", "SOFTWARE_AND_SUBSCRIPTIONS"], ["Uber", "TRAVEL"], ["Delta", "TRAVEL"], ["WeWork", "RENT_AND_LEASE"], ["Upwork fees", "LEGAL_AND_PROFESSIONAL"], ["Upwork", "CONTRACT_LABOR"], ["Unknown vendor", "OTHER"]])("covers vendor %s without AI", async (vendor, category) => {
    vi.stubEnv("GEMINI_API_KEY", ""); expect(await categorizeExpense({ ...input, vendor })).toMatchObject({ category, source: "rules" });
  });
});
