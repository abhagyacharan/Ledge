"use client";

import {
  Check as CheckIcon,
  ChevronRight,
  Download,
  Folder,
  ImageIcon,
  ListTodo,
  NotebookPen,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GoogleG } from "@/modules/auth/google-mark";
import { deleteAccountAction } from "../actions";
import { DELETE_PHRASE } from "../schema";
import { PasswordField } from "./password-fields";
import { ErrorLine, pill, settingsCard, Tick } from "./ui";

const WHAT_GOES = [
  { label: "Tasks", icon: ListTodo },
  { label: "Lists", icon: Folder },
  { label: "Money entries", icon: Wallet },
  { label: "Journal pages", icon: NotebookPen },
  { label: "Plans", icon: Target },
  { label: "Photo", icon: ImageIcon },
];

/**
 * Settings › Delete account (screen 9n): what goes, a nudge to export first, the typed phrase,
 * then proof that it's you (the password, or a fresh Google sign-in for an account with only
 * Google), and the one red pill in Settings.
 */
export function DeleteSection({
  hasPassword,
  email,
  confirmed,
}: {
  hasPassword: boolean;
  email: string;
  /** Google-only: you came back from "Confirm with Google" just now. */
  confirmed: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [pending, startTransition] = useTransition();
  const phraseOk = typed.trim().toLowerCase() === DELETE_PHRASE;
  const provedIt = hasPassword ? password.length > 0 : confirmed;
  const ready = phraseOk && provedIt;

  async function confirmWithGoogle() {
    setOpening(true);
    const { error: failed } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/settings/delete?confirmed=1",
      errorCallbackURL: "/settings/delete",
    });
    if (failed) {
      setOpening(false);
      toast.error("Couldn't open Google. Try again.");
    }
  }

  function remove() {
    if (!ready) return;
    setError(null);
    setPasswordError(null);
    startTransition(async () => {
      try {
        const result = await deleteAccountAction({
          confirm: typed,
          password: hasPassword ? password : undefined,
        });
        if (!result.ok) {
          if (result.fieldErrors?.password) setPasswordError(result.fieldErrors.password);
          else setError(result.error);
          return;
        }
        toast.success("Your account and everything in it are gone.");
        router.replace("/sign-in");
        router.refresh();
      } catch {
        setError("Couldn't reach the server. Try again.");
      }
    });
  }

  return (
    <>
      <p className="-mt-1 text-[15px] leading-relaxed text-dash-ink-soft">
        This deletes everything for good. It skips Trash and can&apos;t be undone.
      </p>
      <div className={cn(settingsCard, "px-4 pt-3 pb-2")}>
        <p className="pb-1 text-[14px] font-semibold">What goes</p>
        <ul className="grid grid-cols-2 gap-x-3 text-[14px]">
          {WHAT_GOES.map((item) => (
            <li key={item.label} className="flex min-h-9 items-center gap-2">
              <item.icon aria-hidden className="size-4 text-dash-ink-soft" />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/settings/export"
        className="flex min-h-13 items-center gap-3 rounded-2xl bg-dash-well px-4 text-[14px] font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Download aria-hidden className="size-4" />
        <span className="flex-1">Export everything first</span>
        <ChevronRight aria-hidden className="size-4 text-dash-ink-soft" />
      </Link>

      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          remove();
        }}
        className="mt-1 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-phrase`} className="text-[13px] font-medium text-dash-ink-soft">
            Type <b className="font-mono text-dash-ink">{DELETE_PHRASE}</b> to confirm
          </label>
          <span className="flex h-12 items-center gap-2 rounded-2xl bg-dash-well px-4 focus-within:ring-3 focus-within:ring-dash-accent/60">
            <input
              id={`${id}-phrase`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent font-mono text-base outline-none md:text-[15px]"
            />
            {phraseOk ? (
              <>
                <Tick on className="size-[18px] [&_svg]:size-3" />
                <span className="sr-only">Matches</span>
              </>
            ) : null}
          </span>
        </div>

        {hasPassword ? (
          <PasswordField
            label="Your password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={passwordError}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-dash-ink-soft">
              Confirm it&apos;s you
            </span>
            {confirmed ? (
              <p className="flex min-h-12 items-center gap-2 rounded-2xl border border-dash-edge px-4 text-[14px] font-medium">
                <CheckIcon aria-hidden className="size-4" />
                Confirmed with Google as {email}
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={confirmWithGoogle}
                  disabled={opening}
                  className={cn(pill.secondary, "h-12")}
                >
                  <GoogleG className="size-[18px]" />
                  {opening ? "Opening Google…" : "Confirm with Google"}
                </button>
                <span className="text-[13px] text-dash-ink-soft">
                  Google asks you to sign in as {email} again.
                </span>
              </>
            )}
          </div>
        )}

        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <button
          type="submit"
          disabled={!ready || pending}
          aria-describedby={!ready ? `${id}-why` : undefined}
          className={pill.danger}
        >
          <Trash2 aria-hidden />
          {pending ? "Deleting…" : "Delete my account forever"}
        </button>
        {!ready ? (
          <span id={`${id}-why`} className="-mt-2 text-center text-[13px] text-dash-ink-soft">
            {!phraseOk
              ? `Type "${DELETE_PHRASE}" first.`
              : hasPassword
                ? "Enter your password first."
                : "Confirm with Google first."}
          </span>
        ) : null}
      </form>
    </>
  );
}
