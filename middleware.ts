import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  const { nextUrl } = request;
  const isDashboardRoute = nextUrl.pathname === "/dashboard" || nextUrl.pathname.startsWith("/dashboard/");
  const isAuthRoute = nextUrl.pathname === "/login";

  if (!request.auth && isDashboardRoute) {
    const loginUrl = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (request.auth && isAuthRoute) {
    const dashboardUrl = new URL("/dashboard", nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
