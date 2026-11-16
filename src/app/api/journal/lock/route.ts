import { JOURNAL_COOKIE } from "@/server/journal-lock";

export const dynamic = "force-dynamic";

/**
 * POST /api/journal/lock: locks the journal by removing its unlock cookie. The app calls it with
 * navigator.sendBeacon when the page is hidden (another app or tab, the screen turning off, the
 * app closing), which still gets through while the page goes away. Locking needs no sign-in
 * check: it can only take access away.
 */
export async function POST() {
  const response = new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.headers.append(
    "Set-Cookie",
    `${JOURNAL_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`,
  );
  return response;
}
