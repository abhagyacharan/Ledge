"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { RESET_LINK_MINUTES } from "./reset-email";
import { FormField } from "./form-field";
import { fieldErrors, forgotPasswordSchema } from "./schema";

/**
 * Asks for a reset link. The answer is the same whether or not the email has an account (no
 * account enumeration), so the "sent" screen says "if".
 */
export function ForgotPasswordForm({ devOutbox }: { devOutbox: boolean }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function send(email: string) {
    setFormError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (error) {
      setFormError(
        error.status === 429
          ? "Too many requests. Wait a minute and try again."
          : "We couldn't send the link. Try again in a moment.",
      );
      return false;
    }
    setSentTo(email);
    return true;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    await send(parsed.data.email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="inline-flex items-center gap-2 text-base font-semibold">
          <MailCheck aria-hidden className="size-5" />
          Check your email
        </p>
        <p className="text-sm text-muted-foreground">
          If <b className="font-medium text-foreground">{sentTo}</b> has a Ledge account, a link to
          choose a new password is on its way. It works once, for {RESET_LINK_MINUTES} minutes.
        </p>
        {devOutbox ? (
          <p className="rounded-xl bg-muted/60 p-3 text-sm">
            Development: no email service is set up, so the link is printed in the server console.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Nothing after a few minutes? Check spam, or{" "}
          <button
            type="button"
            disabled={pending}
            onClick={() => void send(sentTo)}
            className="font-medium text-foreground underline underline-offset-4 disabled:opacity-60"
          >
            send it again
          </button>
          .
        </p>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <BackToSignIn />
      </div>
    );
  }

  return (
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
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <BackToSignIn />
    </form>
  );
}

export function BackToSignIn() {
  return (
    <p className="text-sm text-muted-foreground">
      Remembered it?{" "}
      <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
        Back to sign in
      </Link>
    </p>
  );
}
