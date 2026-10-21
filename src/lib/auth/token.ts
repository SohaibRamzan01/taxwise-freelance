import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "taxwise_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type SessionClaims = { userId: string; role: "USER" | "ADMIN" };

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || new TextEncoder().encode(value).length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(value);
}

export function signSession(user: SessionClaims) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.userId).setIssuer("taxwise").setAudience("taxwise-app")
    .setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).sign(secret());
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  const key = secret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer: "taxwise", audience: "taxwise-app" });
    if (!payload.sub || !["USER", "ADMIN"].includes(String(payload.role))) return null;
    return { userId: payload.sub, role: payload.role as SessionClaims["role"] };
  } catch { return null; }
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS };
}
