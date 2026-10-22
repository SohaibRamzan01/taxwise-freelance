import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareReceiptImage } from "./client-image";
import { RECEIPT_MAX_UPLOAD_BYTES } from "./image-plan";

afterEach(() => vi.unstubAllGlobals());

function browserImage(width: number, height: number, output: Blob | null = new Blob(["jpeg"], { type: "image/jpeg" })) {
  const bitmap = { width, height, close: vi.fn() };
  const context = { fillStyle: "", fillRect: vi.fn(), drawImage: vi.fn() };
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => context), toBlob: vi.fn((callback: BlobCallback) => callback(output)) };
  const decode = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decode);
  vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
  return { bitmap, context, canvas, decode };
}

describe("browser receipt preparation", () => {
  it("keeps a small image unchanged and closes the decoded bitmap", async () => {
    const { bitmap, decode, canvas } = browserImage(1200, 800);
    const file = new File(["png"], "receipt.png", { type: "image/png" });
    expect(await prepareReceiptImage(file)).toBe(file);
    expect(decode).toHaveBeenCalledWith(file, { imageOrientation: "from-image" });
    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it("downscales oriented portrait dimensions and flattens transparency to JPEG", async () => {
    const { bitmap, context, canvas } = browserImage(3024, 4032);
    const output = await prepareReceiptImage(new File(["webp"], "phone.webp", { type: "image/webp" }));
    expect(canvas).toMatchObject({ width: 1500, height: 2000 });
    expect(context.fillStyle).toBe("#fff");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1500, 2000);
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1500, 2000);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.85);
    expect(output).toMatchObject({ name: "phone.jpg", type: "image/jpeg", size: 4 });
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it("prepares a raw photo above 5 MiB instead of rejecting it before resizing", async () => {
    browserImage(4032, 3024);
    const output = await prepareReceiptImage(new File([new Uint8Array(6 * 1024 * 1024)], "phone.jpg", { type: "image/jpeg" }));
    expect(output.size).toBe(4);
  });
  it("rejects a still-oversized result with cropping advice and closes the bitmap", async () => {
    const { bitmap } = browserImage(4000, 3000, new Blob([new Uint8Array(RECEIPT_MAX_UPLOAD_BYTES + 1)]));
    await expect(prepareReceiptImage(new File(["png"], "receipt.png"))).rejects.toThrow("Try cropping it");
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
  it("handles decode, unavailable canvas and encoder failures with helpful errors", async () => {
    const file = new File(["broken"], "receipt.png");
    const { decode } = browserImage(4000, 3000);
    decode.mockRejectedValueOnce(new Error("bad image"));
    await expect(prepareReceiptImage(file)).rejects.toThrow("We couldn't read this photo");
    const noCanvas = browserImage(4000, 3000);
    noCanvas.canvas.getContext.mockReturnValueOnce(null!);
    await expect(prepareReceiptImage(file)).rejects.toThrow("We couldn't resize this photo");
    expect(noCanvas.bitmap.close).toHaveBeenCalledOnce();
    const noBlob = browserImage(4000, 3000, null);
    await expect(prepareReceiptImage(file)).rejects.toThrow("We couldn't resize this photo");
    expect(noBlob.bitmap.close).toHaveBeenCalledOnce();
  });
});
