import { Circle, CircleCheck } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/config/app";

/** The live "At least 10 characters" line under a new-password field (sign-up, reset, Settings). */
export function PasswordRule({ id, length }: { id: string; length: number }) {
  const longEnough = length >= PASSWORD_MIN_LENGTH;
  return (
    <p
      id={id}
      aria-live="polite"
      className={`-mt-2 inline-flex items-center gap-1.5 text-sm ${longEnough ? "font-medium text-dash-good" : "text-muted-foreground"}`}
    >
      {longEnough ? (
        <CircleCheck aria-hidden className="size-4" />
      ) : (
        <Circle aria-hidden className="size-4" />
      )}
      At least {PASSWORD_MIN_LENGTH} characters
      {!longEnough && length > 0 ? ` · ${length} so far` : ""}
    </p>
  );
}
