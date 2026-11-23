import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only: checks that a session cookie EXISTS, not that it is valid.
 * Real protection is `requireUser()` in the (app) layout, pages and every action.
 * We deliberately do not redirect away from /sign-in here, so a stale cookie cannot loop.
 *
 * Signed-out visitors to / see the public page (/welcome) at the same address instead of being sent
 * to sign-in; every other app page still redirects to /sign-in.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    if (request.nextUrl.pathname === "/") {
      return NextResponse.rewrite(new URL("/welcome", request.url));
    }
    const url = new URL("/sign-in", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the public page and its images (site/), auth pages (incl. forgot and reset password), the auth API, health check, Next.js internals/static
  // files, and the icons, manifest, service worker and offline page a phone fetches without cookies
  // when Ledge is added to the home screen (docs/pwa-spec.md). The reminder routes the service worker
  // calls (api/reminders/) check the session themselves and answer 401 JSON, never a redirect.
  matcher: [
    "/((?!welcome|site/|sign-in|sign-up|forgot-password|reset-password|api/auth|api/health|api/reminders/|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|icons/|sw.js|offline.html).*)",
  ],
};
