import { ApiError } from "@/lib/errors";
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export function imageMime(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
export async function readReceiptUpload(request: Request) {
  const limit = MAX_RECEIPT_BYTES + 65536;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) throw new ApiError(415, "INVALID_UPLOAD", "Upload one JPG, PNG or WebP image.");
  if (Number(request.headers.get("content-length")) > limit) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Receipt must be 5 MB or smaller.");
  // Bound the stream as well as Content-Length, which clients can omit or misreport.
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_UPLOAD", "Choose one receipt image.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > limit) { await reader.cancel(); throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Receipt must be 5 MB or smaller."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new ApiError(400, "INVALID_UPLOAD", "Unable to read the image upload."); }
  const entries = [...form.entries()]; const file = form.get("image");
  if (entries.length !== 1 || !(file instanceof File)) throw new ApiError(400, "INVALID_UPLOAD", "Choose exactly one receipt image in the image field.");
  if (!file.size || file.size > MAX_RECEIPT_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Receipt must be non-empty and 5 MB or smaller.");
  const image = Buffer.from(await file.arrayBuffer()); const mimeType = imageMime(image);
  if (!mimeType || mimeType !== file.type.toLowerCase()) throw new ApiError(415, "INVALID_IMAGE", "File contents must match a JPG, PNG or WebP image.");
  return { image, mimeType, size: image.length };
}
