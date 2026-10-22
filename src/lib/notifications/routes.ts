import { z } from "zod";
import { apiHandler, ApiError, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const list = apiHandler(async () => {
  const user = await requireUser();
  const [data, unreadCount] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }, { id: "desc" }], take: 50 }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return Response.json({ data, unreadCount });
});

export const markRead = (request: Request, context: { params: Promise<{ id: string }> }) => apiHandler(async request => {
  const user = await requireUser();
  const id = z.string().min(1).max(100).parse((await context.params).id);
  await parseJson(request, z.object({ read: z.literal(true) }).strict());
  const where = { id, userId: user.id };
  // Preserve the first read time; never reveal whether a foreign ID exists.
  if (!await db.notification.findFirst({ where, select: { id: true } })) throw new ApiError(404, "NOT_FOUND", "Notification not found.");
  await db.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: new Date() } });
  return Response.json({ data: { read: true } });
})(request);
