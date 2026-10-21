import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { write } from "@/lib/domain/service";
import { readReceiptUpload } from "./upload";
import { recognizeReceipt } from "./ocr";
import { parseReceiptText } from "./parser";
export const scanReceipt = apiHandler(async request => {
  const user = await requireUser();
  const upload = await readReceiptUpload(request);
  const parsed = parseReceiptText(await recognizeReceipt(upload.image));
  const receipt = await write(user.id, async tx => {
    await tx.receipt.deleteMany({ where: { userId: user.id, expenseId: null, createdAt: { lt: new Date(Date.now() - 86400000) } } });
    if (await tx.receipt.count({ where: { userId: user.id, expenseId: null } }) >= 10) throw new ApiError(409, "TOO_MANY_RECEIPTS", "Save or discard your pending scans before uploading more.");
    return tx.receipt.create({ data: { ...upload, userId: user.id }, select: { id: true } });
  });
  return Response.json({ data: { ...parsed, receiptId: receipt.id } }, { status: 201 });
});
export const getReceipt = (request: Request, context: { params: Promise<{ id: string }> }) => apiHandler(async () => {
  const user = await requireUser();
  const id = z.string().min(1).max(100).parse((await context.params).id);
  const receipt = await db.receipt.findFirst({ where: { id, userId: user.id } });
  if (!receipt) throw new ApiError(404, "NOT_FOUND", "Receipt not found.");
  return new Response(new Uint8Array(receipt.image), { headers: { "Content-Type": receipt.mimeType, "Content-Length": String(receipt.size), "Content-Disposition": `inline; filename="receipt.${receipt.mimeType === "image/jpeg" ? "jpg" : receipt.mimeType.split("/")[1]}"`, "X-Content-Type-Options": "nosniff" } });
})(request);
export const discardReceipt = (request: Request, context: { params: Promise<{ id: string }> }) => apiHandler(async () => {
  const user = await requireUser();
  const id = z.string().min(1).max(100).parse((await context.params).id);
  await write(user.id, async tx => {
    const result = await tx.receipt.deleteMany({ where: { id, userId: user.id, expenseId: null } });
    if (!result.count) throw new ApiError(404, "NOT_FOUND", "Pending receipt not found.");
    await tx.auditLog.create({ data: { userId: user.id, action: "DELETE", entityType: "receipts", entityId: id } });
  });
  return Response.json({ data: { deleted: true } });
})(request);
