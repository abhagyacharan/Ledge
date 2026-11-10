"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/config/app";
import { authClient } from "@/lib/auth-client";
import { FormField } from "./form-field";
import { fieldErrors, signUpSchema } from "./schema";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    setPending(false);
    if (error) {
      // Deliberately vague: never reveal whether an email is already registered.
      if (error.status === 403) setFormError("Sign-ups are closed.");
      else if (error.status === 429)
        setFormError("Too many attempts. Wait a minute and try again.");
      else setFormError("We couldn't create that account. Check your details and try again.");
      return;
    }
    router.replace("/inbox");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="name" label="Name" autoComplete="name" autoFocus error={errors.name} />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email}
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        error={errors.password}
      />
      <p className="-mt-2 text-sm text-muted-foreground">
        At least {PASSWORD_MIN_LENGTH} characters.
      </p>
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
