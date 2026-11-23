import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/server/auth";

/** The validated session for this request (one DB lookup per request), or null. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export type AuthedUser = {
  userId: string;
  /** `image` is the profile photo's address (Settings � Account), or null. */
  user: { id: string; name: string; email: string; image: string | null };
};

/**
 * Call at the top of every server action, route handler and page that needs a user
 * (CLAUDE.md §5). Redirects to /sign-in when there is no valid session.
 * Do not rely on the proxy alone: it only checks that a cookie exists.
 */
export async function requireUser(): Promise<AuthedUser> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id, name, email, image } = session.user;
  return { userId: id, user: { id, name, email, image: image ?? null } };
}
