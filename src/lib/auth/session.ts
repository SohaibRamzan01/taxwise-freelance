import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { SESSION_COOKIE, verifySession } from "./token";

export const sessionUserSelect = {
  id: true, email: true, name: true, role: true, isActive: true,
} as const;

export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySession(token);
  if (!claims) return null;
  const user = await db.user.findUnique({ where: { id: claims.userId }, select: sessionUserSelect });
  return user?.isActive ? user : null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Please sign in to continue.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  return user;
}
