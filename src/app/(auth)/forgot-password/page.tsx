import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BackToSignIn, ForgotPasswordForm } from "@/modules/auth/forgot-password-form";
import { getEmailConfig } from "@/server/env";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/");
  const email = getEmailConfig();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Forgot password</h1>
      {email.mode === "off" ? (
        <>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            This server can&apos;t send email yet, so it can&apos;t send a reset link. Ask its owner
            to reset the password for you.
          </p>
          <BackToSignIn />
        </>
      ) : (
        <>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            Enter your account&apos;s email and we&apos;ll send a link to choose a new password.
          </p>
          <ForgotPasswordForm devOutbox={email.mode === "outbox"} />
        </>
      )}
    </>
  );
}
