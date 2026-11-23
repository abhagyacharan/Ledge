"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { GoogleG } from "./google-mark";

/**
 * The Google button under the email form on sign-in ("Continue with Google") and sign-up ("Sign up
 * with Google"). Black in both themes, with Google's four-colour G, like most apps (O, 2026-11-23;
 * the colours follow Google's dark button). Better Auth sends the browser to Google and back to
 * /api/auth/callback/google; problems come back to /sign-in as ?error=<code>.
 */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  async function go() {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    });
    // On success the page is already leaving for Google; only a refusal (such as too many tries)
    // lands here.
    if (error) setPending(false);
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[#8e918f] bg-[#131314] text-sm font-semibold text-[#e3e3e3] outline-none hover:bg-[#262628] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
    >
      <GoogleG className="size-[18px]" />
      {pending ? "Opening Google…" : label}
    </button>
  );
}

/** The thin "or" rule between the email form and the Google button. */
export function OrDivider() {
  return (
    <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
