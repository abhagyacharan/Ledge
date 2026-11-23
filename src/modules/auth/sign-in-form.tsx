"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FormField } from "./form-field";
import { GoogleButton, OrDivider } from "./google-button";
import { fieldErrors, signInSchema } from "./schema";

const GENERIC_ERROR = "That email and password don't match.";
/** Sign-in allows 5 tries a minute (src/server/auth.ts); after that the button waits this long. */
const LOCKOUT_MS = 60_000;

export function SignInForm({
  signUpOpen,
  google,
  resetOpen,
  googleError,
}: {
  signUpOpen: boolean;
  /** "Continue with Google" is set up on this server. */
  google: boolean;
  /** Email is set up, so "Forgot password?" can send a link. */
  resetOpen: boolean;
  /** Why Google sent the visitor back, if it did (oauth-errors.ts). */
  googleError: string | null;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  // Turn the button back on when the wait is over.
  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setTimeout(() => setLockedUntil(null), Math.max(0, lockedUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [lockedUntil]);
  const until = lockedUntil
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(lockedUntil)
    : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    setPending(false);
    if (error) {
      if (error.status === 429) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        return;
      }
      // Same message for unknown email and wrong password (no account enumeration).
      setFormError(GENERIC_ERROR);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      {googleError ? (
        <p role="alert" className="mb-4 rounded-xl bg-muted/60 p-3 text-sm">
          {googleError}
        </p>
      ) : null}
      {/* method="post": if someone submits before the page's script runs, the browser posts the
          form instead of putting the password in the address bar. */}
      <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          labelAside={
            resetOpen ? (
              <Link
                href="/forgot-password"
                className="-my-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-8"
              >
                Forgot password?
              </Link>
            ) : null
          }
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        {until ? (
          <div role="alert" className="rounded-xl bg-muted/60 p-3">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Timer aria-hidden className="size-4" />
              Too many tries. Wait a few minutes.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can sign in again at {until}. The button stays off until then.
            </p>
          </div>
        ) : null}
        <Button type="submit" className="h-11" disabled={pending || until !== null}>
          {until ? `Sign in available at ${until}` : pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {/* Google comes after the email form, with an "or" rule between (O, 2026-11-23). */}
      {google ? (
        <div className="mt-4 flex flex-col gap-4">
          <OrDivider />
          <GoogleButton label="Continue with Google" />
        </div>
      ) : null}
      {signUpOpen ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Ledge?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      ) : null}
    </>
  );
}
