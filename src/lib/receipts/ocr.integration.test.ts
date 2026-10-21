import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { recognizeReceipt } from "./ocr";
import { parseReceiptText } from "./parser";
describe("real Tesseract OCR", () => {
  it("reads the generated hardware receipt using bundled English data", async () => {
    const text = await recognizeReceipt(await readFile("public/samples/hardware.png"));
    expect(parseReceiptText(text)).toMatchObject({ vendor: "DELL", date: "2026-06-16", totalCents: 31104, suggestion: { category: "COMPUTER_HARDWARE" } });
  }, 35000);
});
