import { createWorker, OEM, type Worker } from "tesseract.js";
import { createRequire } from "node:module";
import path from "node:path";
import { ApiError } from "@/lib/errors";
const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
// Limit CPU/memory per process; callers can always continue with manual entry.
let busy = false;
export async function recognizeReceipt(image: Buffer, timeoutMs = 25000): Promise<string> {
  if (busy) throw new ApiError(429, "OCR_BUSY", "The scanner is busy. Retry shortly or enter the expense manually.");
  busy = true;
  let worker: Worker | undefined; let expired = false; let timer: ReturnType<typeof setTimeout> | undefined;
  const work = (async () => {
    worker = await createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: nodeRequire.resolve("tesseract.js/src/worker-script/node/index.js"),
      langPath: path.join(path.dirname(nodeRequire.resolve("@tesseract.js-data/eng/package.json")), "4.0.0"),
      cacheMethod: "none",
      // tesseract.js otherwise throws some job errors outside the rejected promise.
      errorHandler: () => {},
    });
    if (expired) { await worker.terminate(); return ""; }
    const result = await worker.recognize(image);
    return result.data.text;
  })();
  try {
    const text = await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(new ApiError(504, "OCR_TIMEOUT", "Scanning timed out. Try a clearer image or enter the expense manually.")); }, timeoutMs);
    })]);
    if (!text.trim()) throw new ApiError(422, "OCR_EMPTY", "No text was found. Try a clearer image or enter the expense manually.");
    return text;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, "OCR_FAILED", "Unable to read this receipt. Try another image or enter the expense manually.");
  } finally {
    clearTimeout(timer);
    if (worker) await worker.terminate().catch(() => {});
    // A late worker initialization is terminated by work before recognition.
    if (expired && !worker) void work.finally(() => { busy = false; }).catch(() => {});
    else busy = false;
  }
}
