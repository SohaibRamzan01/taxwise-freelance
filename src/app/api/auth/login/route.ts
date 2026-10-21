import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, apiHandler, parseJson } from "@/lib/api";
import { getDummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";
import { limitAuth } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";

export const POST = apiHandler(async request => {
  const input = await parseJson(request, loginSchema);
  limitAuth(request, input.email, "login");
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = await verifyPassword(input.password, user?.passwordHash ?? await getDummyPasswordHash());
  if (!user || !valid || !user.isActive) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  const token = await signSession({ userId: user.id, role: user.role });
  await db.auditLog.create({ data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id } });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
});
