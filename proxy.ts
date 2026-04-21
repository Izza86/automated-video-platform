import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Inline constants to avoid import issues in proxy layer
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = await getSessionCookie(request);
  const isAuthenticated = !!sessionCookie;

  // ── 1. Security headers on ALL responses ────────────────────────────────
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // ── 2. Cache headers for static assets ──────────────────────────────────
  if (
    pathname.startsWith("/_next/static") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/)
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // ── 3. Manual login flow ─────────────────────────────────────────────────
  // Do NOT auto-redirect authenticated users away from /login, /signup, or /.
  // The user must be able to view the landing page and login page at all
  // times. The redirect to /dashboard happens only after the user explicitly
  // clicks "Sign In" in the LoginForm.

  // ── 4. Protect /dashboard/* — redirect to login if not authenticated ────
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Admin role check happens server-side in dashboard/admin/layout.tsx
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except API routes, static files, image optimization, favicon
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
