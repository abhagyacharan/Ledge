"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { PASSWORD_MIN_LENGTH } from "@/config/app";
import { cn } from "@/lib/utils";
import { Tick } from "./ui";

/** A password field in the Settings look, with a show or hide button. */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string | null;
  describedBy?: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-dash-ink-soft">
        {label}
      </label>
      <span className="flex h-12 items-center gap-1 rounded-2xl bg-dash-well pr-1 pl-4 focus-within:ring-3 focus-within:ring-dash-accent/60">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          maxLength={128}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [describedBy, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
          }
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-dash-ink outline-none md:text-[15px]"
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="grid size-10 place-items-center rounded-full text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {shown ? (
            <EyeOff aria-hidden className="size-4" />
          ) : (
            <Eye aria-hidden className="size-4" />
          )}
        </button>
      </span>
      {error ? (
        <span id={`${id}-error`} className="text-[13px] font-medium text-dash-bad">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** One live check under a new password, written out with a filled or empty circle. */
export function Check({ ok, children, id }: { ok: boolean; children: ReactNode; id?: string }) {
  return (
    <span
      id={id}
      className={cn(
        "-mt-1 flex items-center gap-2 text-[13px]",
        ok ? "font-medium text-dash-ink" : "text-dash-ink-soft",
      )}
    >
      <Tick on={ok} className="size-[18px] [&_svg]:size-3" />
      {children}
      <span className="sr-only">{ok ? "(done)" : "(not yet)"}</span>
    </span>
  );
}

/** The two checks a new password needs: its length, and the confirmation matching. */
export function newPasswordChecks(password: string, confirm: string) {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;
  const matches = confirm.length > 0 && confirm === password;
  return { longEnough, matches, ready: longEnough && matches };
}
