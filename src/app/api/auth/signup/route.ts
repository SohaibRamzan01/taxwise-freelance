import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, apiHandler, parseJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { signupRole, signupSchema } from "@/lib/auth/validation";
import { limitAuth } from "@/lib/auth/rate-limit";
import { sessionUserSelect } from "@/lib/auth/session";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/token";

export const POST = apiHandler(async request => {
  const input = await parseJson(request, signupSchema);
  limitAuth(request, input.email, "signup");
  const passwordHash = await hashPassword(input.password);
  try {
    const result = await db.$transaction(async tx => {
      const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash, role: signupRole(input.email) }, select: sessionUserSelect });
      const token = await signSession({ userId: user.id, role: user.role });
      await tx.auditLog.create({ data: { userId: user.id, action: "SIGNUP", entityType: "User", entityId: user.id } });
      return { user, token };
    });
    const response = NextResponse.json({ user: result.user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ApiError(409, "EMAIL_UNAVAILABLE", "An account with this email already exists.");
    throw error;
  }
});
