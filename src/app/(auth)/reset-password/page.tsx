import type { Metadata } from "next";
import { ResetLinkExpired, ResetPasswordForm } from "@/modules/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

/**
 * Where the emailed link lands. Better Auth checks the token at /api/auth/reset-password/<token>
 * first and sends the browser here with ?token=... when it is good, or ?error=INVALID_TOKEN.
 * Signed-in visitors can use it too (someone resetting from another device).
 */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;
  const good = typeof token === "string" && token.length > 0 && !error;
  return good ? <ResetPasswordForm token={token} /> : <ResetLinkExpired />;
}
