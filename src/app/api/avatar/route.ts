import { getAvatar } from "@/server/data/avatars";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/avatar?v=<version>: the signed-in person's own profile photo (Settings › Account). Only
 * ever your own, so nobody can read another account's photo. The version in the address changes
 * with every new photo, so the browser may keep each one for a long time.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response(null, { status: 401 });
  const avatar = await getAvatar(session.user.id);
  if (!avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // A photo, never a page: nothing in it may run.
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
