"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { FormField } from "./form-field";
import { fieldErrors, signInSchema } from "./schema";

const GENERIC_ERROR = "Incorrect email or password.";

export function SignInForm({ signUpOpen }: { signUpOpen: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      // Same message for unknown email and wrong password (no account enumeration).
      setFormError(
        error.status === 429 ? "Too many attempts. Wait a minute and try again." : GENERIC_ERROR,
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
      />
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {signUpOpen ? (
        <p className="text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      ) : null}
    </form>
  );
}
