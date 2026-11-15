import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/modules/auth/sign-up-form";
import { isSignupAllowed } from "@/server/env";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/");

  if (!isSignupAllowed()) {
    return (
      <div>
        <h1 className="mb-2 inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Lock aria-hidden className="size-5" />
          Sign-ups are closed on this server
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This Ledge is private. Ask its owner for an account, or sign in if you already have one.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Start your book. It stays on this server.
      </p>
      <SignUpForm />
    </>
  );
}
