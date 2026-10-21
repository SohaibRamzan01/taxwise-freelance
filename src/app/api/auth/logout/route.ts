import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/token";
import { db } from "@/lib/db";

export const POST = apiHandler(async () => {
  const user = await getSessionUser();
  if (user) await db.auditLog.create({ data: { userId: user.id, action: "LOGOUT", entityType: "User", entityId: user.id } });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
});
