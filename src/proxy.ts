import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only: checks that a session cookie EXISTS, not that it is valid.
 * Real protection is `requireUser()` in the (app) layout, pages and every action.
 * We deliberately do not redirect away from /sign-in here, so a stale cookie cannot loop.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except auth pages, the auth API, health check, Next.js internals/static files, and the
  // icons and manifest a phone fetches without cookies when Ledge is added to the home screen.
  matcher: [
    "/((?!sign-in|sign-up|api/auth|api/health|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/).*)",
  ],
};
