// admin-frontend/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that don't require authentication
const PUBLIC_PATHS = ["/sign-in"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Check for access token cookie
  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    // No token — redirect to sign-in with return URL
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Token exists — let the page load.
  // The actual admin verification happens client-side via the AuthProvider
  // which calls /api/v1/admin/me. If not an admin, user sees an error.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
