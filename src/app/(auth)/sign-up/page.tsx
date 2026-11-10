import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/modules/auth/sign-up-form";
import { isSignupAllowed } from "@/server/env";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/inbox");

  if (!isSignupAllowed()) {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sign-ups are closed</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This instance is not accepting new accounts.
        </p>
        <Link href="/sign-in" className="text-sm font-medium underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Create account</h1>
      <SignUpForm />
    </>
  );
}
