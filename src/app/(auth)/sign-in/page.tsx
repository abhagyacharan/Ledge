import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/modules/auth/sign-in-form";
import { getSession } from "@/server/session";
import { isSignupAllowed } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getSession()) redirect("/inbox");
  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm signUpOpen={isSignupAllowed()} />
    </>
  );
}
