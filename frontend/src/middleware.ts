import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const token = getToken();
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/).*)"],
};