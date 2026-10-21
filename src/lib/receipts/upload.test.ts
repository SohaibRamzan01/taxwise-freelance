import { describe, expect, it } from "vitest";
import { readReceiptUpload, imageMime, MAX_RECEIPT_BYTES } from "./upload";
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function request(bytes = png, mime = "image/png", extra = false) {
  const form = new FormData(); form.append("image", new File([bytes], "receipt.png", { type: mime }));
  if (extra) form.append("other", "no");
  return new Request("http://localhost/api/receipts/scan", { method: "POST", body: form });
}
describe("receipt upload validation", () => {
  it("checks PNG, JPEG and WebP signatures", async () => {
    expect(imageMime(png)).toBe("image/png"); expect(imageMime(Buffer.from([255, 216, 255, 0]))).toBe("image/jpeg");
    expect(imageMime(Buffer.from("RIFF0000WEBP"))).toBe("image/webp"); expect(imageMime(Buffer.from("<svg/>"))).toBeNull();
    expect(await readReceiptUpload(request())).toEqual({ image: png, mimeType: "image/png", size: 8 });
  });
  it("rejects spoofed MIME, extra fields, empty and oversized images", async () => {
    await expect(readReceiptUpload(request(Buffer.from("<script>bad</script>")))).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    await expect(readReceiptUpload(request(png, "image/jpeg"))).rejects.toMatchObject({ code: "INVALID_IMAGE" });
    await expect(readReceiptUpload(request(png, "image/png", true))).rejects.toMatchObject({ code: "INVALID_UPLOAD" });
    await expect(readReceiptUpload(request(Buffer.alloc(0)))).rejects.toMatchObject({ status: 413 });
    await expect(readReceiptUpload(request(Buffer.alloc(MAX_RECEIPT_BYTES + 1)))).rejects.toMatchObject({ status: 413 });
    const tooLarge = request(); tooLarge.headers.set("content-length", String(MAX_RECEIPT_BYTES + 100000));
    await expect(readReceiptUpload(tooLarge)).rejects.toMatchObject({ status: 413 });
  });
  it("limits streamed bytes without Content-Length and rejects malformed forms", async () => {
    const huge = new Request("http://localhost", { method: "POST", body: Buffer.alloc(MAX_RECEIPT_BYTES + 100000), headers: { "content-type": "multipart/form-data; boundary=x" } });
    await expect(readReceiptUpload(huge)).rejects.toMatchObject({ status: 413 });
    await expect(readReceiptUpload(new Request("http://localhost", { method: "POST", body: "bad" }))).rejects.toMatchObject({ status: 415 });
    await expect(readReceiptUpload(new Request("http://localhost", { method: "POST", body: "bad", headers: { "content-type": "multipart/form-data" } }))).rejects.toMatchObject({ status: 400 });
    const form = new FormData(); form.set("image", "bad");
    await expect(readReceiptUpload(new Request("http://localhost", { method: "POST", body: form }))).rejects.toMatchObject({ status: 400 });
    await expect(readReceiptUpload(new Request("http://localhost", { method: "POST", headers: { "content-type": "multipart/form-data" } }))).rejects.toMatchObject({ status: 400 });
  });
});
