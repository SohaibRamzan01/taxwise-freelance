import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: mocks.createWorker, OEM: { LSTM_ONLY: 1 } }));
import { recognizeReceipt } from "./ocr";
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });
describe("OCR lifecycle", () => {
  it("reads text, releases resources, and translates OCR failures", async () => {
    const worker = { recognize: vi.fn().mockResolvedValue({ data: { text: "DELL\nTOTAL 12.34" } }), terminate: vi.fn().mockResolvedValue(undefined) };
    mocks.createWorker.mockResolvedValue(worker);
    expect(await recognizeReceipt(Buffer.from("image"))).toContain("DELL"); expect(worker.terminate).toHaveBeenCalled();
    worker.recognize.mockRejectedValueOnce(new Error("decode"));
    await expect(recognizeReceipt(Buffer.from("bad"))).rejects.toMatchObject({ code: "OCR_FAILED" });
    worker.recognize.mockResolvedValueOnce({ data: { text: " " } });
    await expect(recognizeReceipt(Buffer.from("blank"))).rejects.toMatchObject({ code: "OCR_EMPTY" });
  });
  it("times out recognition, limits concurrency, and allows the next scan", async () => {
    vi.useFakeTimers();
    const worker = { recognize: vi.fn().mockImplementation(() => new Promise(() => {})), terminate: vi.fn().mockResolvedValue(undefined) };
    mocks.createWorker.mockResolvedValue(worker);
    const scan = recognizeReceipt(Buffer.from("image"), 50);
    const rejected = expect(scan).rejects.toMatchObject({ code: "OCR_TIMEOUT" });
    await expect(recognizeReceipt(Buffer.from("other"))).rejects.toMatchObject({ code: "OCR_BUSY" });
    await vi.advanceTimersByTimeAsync(51); await rejected; expect(worker.terminate).toHaveBeenCalled();
    worker.recognize.mockResolvedValueOnce({ data: { text: "Hello" } }); expect(await recognizeReceipt(Buffer.from("new"))).toBe("Hello");
  });
  it("terminates a worker that initializes after the deadline", async () => {
    vi.useFakeTimers();
    const worker = { recognize: vi.fn(), terminate: vi.fn().mockResolvedValue(undefined) };
    let initialized!: (worker: unknown) => void;
    mocks.createWorker.mockImplementation(() => new Promise(resolve => { initialized = resolve; }));
    const rejected = expect(recognizeReceipt(Buffer.from("image"), 10)).rejects.toMatchObject({ code: "OCR_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(11); await rejected;
    initialized(worker); await vi.advanceTimersByTimeAsync(0);
    expect(worker.terminate).toHaveBeenCalled(); expect(worker.recognize).not.toHaveBeenCalled();
  });
});
