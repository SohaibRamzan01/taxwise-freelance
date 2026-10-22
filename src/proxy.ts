import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  // The server admin layout and every admin API reload the current database role.
  // A JWT role can be stale after an administrator promotes or demotes an account.
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/expenses/:path*", "/income/:path*", "/invoices/:path*", "/clients/:path*", "/tax-estimator/:path*", "/estimated-payments/:path*", "/settings/:path*", "/reports/:path*", "/admin/:path*"] };
