import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleErrorMessage } from "@/modules/auth/oauth-errors";
import { SignInForm } from "@/modules/auth/sign-in-form";
import { getGoogleConfig, isPasswordResetEnabled, isSignupAllowed } from "@/server/env";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if (await getSession()) redirect("/");
  const { error } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to Ledge</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">Your tasks, money and journal.</p>
      <SignInForm
        signUpOpen={isSignupAllowed()}
        google={getGoogleConfig() !== null}
        resetOpen={isPasswordResetEnabled()}
        googleError={googleErrorMessage(typeof error === "string" ? error : undefined)}
      />
    </>
  );
}
