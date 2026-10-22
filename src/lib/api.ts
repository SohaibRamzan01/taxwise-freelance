import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "./errors";
export { ApiError } from "./errors";

export function errorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Please check your input.", details: z.flattenError(error) } }, { status: 400 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } }, { status: error.status });
  }
  console.error("API request failed", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
}

export function assertSameOrigin(request: Request) {
  const allowedOrigin = new URL(process.env.APP_URL || request.url).origin;
  const origin = request.headers.get("origin");
  if (origin !== allowedOrigin) throw new ApiError(403, "INVALID_ORIGIN", "Request origin is not allowed.");
}

export async function parseJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 16_384): Promise<T> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON with Content-Type application/json.");
  }
  const tooLarge = () => new ApiError(413, "PAYLOAD_TOO_LARGE", "Request is too large.");
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > maxBytes) { await reader.cancel(); throw tooLarge(); }
        chunks.push(part.value);
      }
    } finally { reader.releaseLock(); }
  }
  const body = new TextDecoder().decode(Buffer.concat(chunks));
  let json: unknown;
  try { json = JSON.parse(body); } catch { throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON."); }
  return schema.parse(json);
}

export function apiHandler(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      const response = await handler(request);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      const response = errorResponse(error);
      response.headers.set("Cache-Control", "no-store");
      if (error instanceof ApiError && error.status === 429) response.headers.set("Retry-After", "900");
      return response;
    }
  };
}
