"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FormField } from "./form-field";
import { PasswordRule } from "./password-rule";
import { fieldErrors, newPasswordSchema } from "./schema";

/** Page title and one line under it, shared by every state of the reset page. */
function Heading({ title, line }: { title: string; line: string }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">{line}</p>
    </>
  );
}

/** The link was used, expired or mangled: one way forward. */
export function ResetLinkExpired() {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="This link has expired" line="Nothing was changed." />
      <p className="-mt-4 text-sm text-muted-foreground">
        Reset links work once and only for a short time. Ask for a new one and use the newest email.
      </p>
      <Link
        href="/forgot-password"
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Send a new link
      </Link>
    </div>
  );
}

/** New password twice. Every sign-in ends afterwards, so the visitor signs in again. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<"form" | "done" | "expired">("form");
  const [passwordLength, setPasswordLength] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = newPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.resetPassword({ newPassword: parsed.data.password, token });
    setPending(false);
    if (error) {
      if (error.status === 429) setFormError("Too many tries. Wait a minute and try again.");
      else if (error.code === "INVALID_TOKEN" || error.status === 400) setState("expired");
      else setFormError("We couldn't change the password. Try again in a moment.");
      return;
    }
    setState("done");
  }

  if (state === "expired") return <ResetLinkExpired />;

  if (state === "done") {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <CircleCheck aria-hidden className="size-7 text-dash-good" />
          Password changed
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          You were signed out everywhere, to be safe. Sign in with the new password.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <Heading
        title="Choose a new password"
        line="Use at least 10 characters. A short sentence works well."
      />
      <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          autoFocus
          error={errors.password}
          aria-describedby="password-rule"
          onChange={(e) => setPasswordLength(e.currentTarget.value.length)}
        />
        <PasswordRule id="password-rule" length={passwordLength} />
        <FormField
          id="confirm"
          label="Type it again"
          type="password"
          autoComplete="new-password"
          error={errors.confirm}
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </>
  );
}
