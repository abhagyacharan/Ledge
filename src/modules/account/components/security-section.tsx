"use client";

import { Check as CheckIcon, KeyRound, Monitor, Smartphone, Tablet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import { PASSWORD_MIN_LENGTH } from "@/config/app";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GoogleG } from "@/modules/auth/google-mark";
import { run } from "@/modules/todos/components/run-action";
import {
  disconnectGoogleAction,
  setPasswordAction,
  signOutDeviceAction,
  signOutOtherDevicesAction,
} from "../actions";
import type { DeviceKind } from "../devices";
import { Check, newPasswordChecks, PasswordField } from "./password-fields";
import { ErrorLine, GroupLabel, pill, RowIcon, SectionHeader, settingsCard, Sub, Tick } from "./ui";

export type DeviceRow = {
  id: string;
  name: string;
  kind: DeviceKind;
  lastActive: string;
  current: boolean;
};

const DEVICE_ICONS = { phone: Smartphone, tablet: Tablet, computer: Monitor } as const;

/** A sign-in method row: icon, name, status in words, one action (under the status on a phone). */
const methodRow =
  "flex flex-wrap items-start gap-3 border-t border-dash-edge p-4 first:border-t-0 md:min-h-[72px] md:items-center";

/**
 * Settings › Sign-in & security (screens 9e to 9i): the sign-in methods (Google and password, with
 * the rule that you can't remove your last one), the devices signed in, and the sheets to set or
 * change the password and to disconnect Google.
 */
export function SecuritySection({
  email,
  password,
  google,
  passwordChanged,
  googleSince,
  googleAvailable,
  googleError,
  devices,
}: {
  email: string;
  password: boolean;
  google: boolean;
  /** "3 Nov 2026", already in the person's time zone. */
  passwordChanged: string | null;
  googleSince: string | null;
  /** Google sign-in is set up on this server. */
  googleAvailable: boolean;
  /** Why Google sent you back from Connect Google, if it did. */
  googleError: string | null;
  devices: DeviceRow[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"set" | "change" | "disconnect" | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pending, startTransition] = useTransition();
  const others = devices.filter((d) => !d.current);

  async function connectGoogle() {
    setConnecting(true);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/security",
      errorCallbackURL: "/settings/security",
    });
    // On success the page is already leaving for Google.
    if (error) {
      setConnecting(false);
      toast.error("Couldn't open Google. Try again.");
    }
  }

  function signOutDevice(id: string) {
    startTransition(async () => {
      const result = await run(signOutDeviceAction({ id }), { success: "Signed out." });
      if (result.ok) router.refresh();
    });
  }

  function signOutOthers() {
    startTransition(async () => {
      const result = await run(signOutOtherDevicesAction({}), {
        success: "Signed out everywhere else.",
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader title="Sign-in & security" />

      <GroupLabel id="methods-title">Sign-in methods</GroupLabel>
      <section aria-labelledby="methods-title" className={settingsCard}>
        {googleAvailable || google ? (
          <div className={methodRow}>
            <RowIcon className="size-10">
              <GoogleG className="size-[18px]" />
            </RowIcon>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Google</span>
                <Sub>
                  {google ? (
                    <>
                      Connected as {email}
                      {googleSince ? (
                        <>
                          {" "}
                          · since <span className="font-mono text-[12px]">{googleSince}</span>
                        </>
                      ) : null}
                    </>
                  ) : (
                    "Not connected"
                  )}
                </Sub>
              </span>
              {google ? (
                <span className="flex flex-col gap-2 md:items-end">
                  <button
                    type="button"
                    aria-disabled={!password || undefined}
                    aria-describedby={!password ? "disconnect-why" : undefined}
                    onClick={() => (password ? setSheet("disconnect") : undefined)}
                    className={cn(pill.small, "self-start md:self-auto", !password && "opacity-50")}
                  >
                    Disconnect
                  </button>
                  {!password ? (
                    <span
                      id="disconnect-why"
                      className="text-[13px] leading-snug text-dash-ink-soft"
                    >
                      It&apos;s your only way to sign in.{" "}
                      <button
                        type="button"
                        onClick={() => setSheet("set")}
                        className="min-h-8 font-semibold text-dash-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        Set a password first
                      </button>
                    </span>
                  ) : null}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={connectGoogle}
                  disabled={connecting}
                  className={cn(pill.small, "self-start md:self-auto")}
                >
                  <GoogleG className="size-4" />
                  {connecting ? "Opening Google…" : "Connect Google"}
                </button>
              )}
            </div>
            {googleError && !google ? (
              <ErrorLine className="basis-full">{googleError}</ErrorLine>
            ) : null}
          </div>
        ) : null}
        <div className={methodRow}>
          <RowIcon className="size-10">
            <KeyRound />
          </RowIcon>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Password</span>
              <Sub>
                {password ? (
                  <>
                    Set
                    {passwordChanged ? (
                      <>
                        {" "}
                        · last changed{" "}
                        <span className="font-mono text-[12px]">{passwordChanged}</span>
                      </>
                    ) : null}
                  </>
                ) : (
                  "Not set"
                )}
              </Sub>
            </span>
            <button
              type="button"
              onClick={() => setSheet(password ? "change" : "set")}
              className={cn(pill.small, "self-start md:self-auto")}
            >
              {password ? "Change password" : "Set a password"}
            </button>
          </div>
        </div>
      </section>
      <p className="px-1 text-[13px] leading-snug text-dash-ink-soft">
        You need at least one way to sign in. Ledge never sees your Google password.
      </p>

      <GroupLabel id="devices-title">Devices</GroupLabel>
      <section aria-labelledby="devices-title" className={settingsCard}>
        <ul>
          {devices.map((d) => {
            const Icon = DEVICE_ICONS[d.kind];
            return (
              <li
                key={d.id}
                className="flex min-h-16 items-center gap-3 border-t border-dash-edge px-4 py-2.5 first:border-t-0"
              >
                <RowIcon className="size-10">
                  <Icon />
                </RowIcon>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
                    {d.name}
                    {d.current ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-dash-well px-2.5 text-[12px] font-medium">
                        This device
                      </span>
                    ) : null}
                  </span>
                  <span className="block font-mono text-[12px] font-medium text-dash-ink-soft">
                    {d.current ? "Active now" : d.lastActive}
                  </span>
                </span>
                {d.current ? null : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => signOutDevice(d.id)}
                    aria-label={`Sign out ${d.name}`}
                    className={pill.small}
                  >
                    Sign out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {others.length > 0 ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3.5">
          <button
            type="button"
            disabled={pending}
            onClick={signOutOthers}
            className={pill.secondary}
          >
            Sign out everywhere else
          </button>
          <span className="text-center text-[13px] text-dash-ink-soft md:text-left">
            Other devices notice within 5 minutes.
          </span>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 px-1 text-[13px] text-dash-ink-soft">
          <CheckIcon aria-hidden className="size-3.5" />
          Only this device is signed in.
        </p>
      )}

      <SetPasswordSheet open={sheet === "set"} email={email} onClose={() => setSheet(null)} />
      <ChangePasswordSheet
        open={sheet === "change"}
        others={others.map((d) => d.name)}
        onClose={() => setSheet(null)}
      />
      <DisconnectSheet open={sheet === "disconnect"} email={email} onClose={() => setSheet(null)} />
    </div>
  );
}

/** Set a password (screen 9h): for an account made with Google. */
function SetPasswordSheet({
  open,
  email,
  onClose,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const checks = newPasswordChecks(password, confirm);

  function submit() {
    if (!checks.ready) return;
    startTransition(async () => {
      const result = await run(setPasswordAction({ password, confirm }), {
        success: "Password set.",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      onClosed={() => {
        setPassword("");
        setConfirm("");
        setError(null);
      }}
    >
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SheetHeader
          title="Set a password"
          description={`Then you can sign in with ${email} and a password as well as Google.`}
        />
        <SheetBody className="flex flex-col gap-4">
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            describedBy="set-length"
          />
          <Check id="set-length" ok={checks.longEnough}>
            At least {PASSWORD_MIN_LENGTH} characters{" "}
            <span className="font-mono text-[12px] text-dash-ink-soft">{password.length}</span>
          </Check>
          <PasswordField
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            describedBy="set-match"
          />
          <Check id="set-match" ok={checks.matches}>
            Matches the new password
          </Check>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
        </SheetBody>
        <SheetFooter>
          <button type="button" onClick={onClose} className={pill.secondary}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!checks.ready || pending}
            className={cn(pill.primary, "flex-1")}
          >
            {pending ? "Setting…" : "Set password"}
          </button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

/** Change password (screen 9h): current, new and confirm, and sign out other devices. */
function ChangePasswordSheet({
  open,
  others,
  onClose,
}: {
  open: boolean;
  /** The other devices' names, for the checkbox's line. */
  others: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const checks = newPasswordChecks(password, confirm);
  const ready = checks.ready && current.length > 0;

  async function submit() {
    if (!ready) return;
    setPending(true);
    setError(null);
    setCurrentError(null);
    const { error: failed } = await authClient.changePassword({
      currentPassword: current,
      newPassword: password,
      revokeOtherSessions: signOutOthers,
    });
    setPending(false);
    if (failed) {
      if (failed.status === 429) setError("Too many tries. Wait a minute and try again.");
      else if (failed.status === 400) setCurrentError("That isn't your current password.");
      else setError("Couldn't change the password. Try again.");
      return;
    }
    toast.success("Password changed.");
    onClose();
    router.refresh();
  }

  const whoNeedsIt =
    others.length === 0
      ? "No other device is signed in right now."
      : others.length <= 2
        ? `${others.join(" and ")} will need the new password.`
        : `${others.length} other devices will need the new password.`;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      onClosed={() => {
        setCurrent("");
        setPassword("");
        setConfirm("");
        setSignOutOthers(true);
        setError(null);
        setCurrentError(null);
      }}
    >
      <form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <SheetHeader title="Change password" />
        <SheetBody className="flex flex-col gap-4">
          <PasswordField
            label="Current password"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            error={currentError}
          />
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            describedBy="change-length"
          />
          <Check id="change-length" ok={checks.longEnough}>
            At least {PASSWORD_MIN_LENGTH} characters{" "}
            <span className="font-mono text-[12px] text-dash-ink-soft">{password.length}</span>
          </Check>
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            describedBy="change-match"
          />
          <Check id="change-match" ok={checks.matches}>
            Matches the new password
          </Check>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-dash-well p-3.5 focus-within:ring-3 focus-within:ring-ring/50">
            <input
              type="checkbox"
              checked={signOutOthers}
              onChange={(e) => setSignOutOthers(e.target.checked)}
              className="sr-only"
            />
            <Tick on={signOutOthers} className="mt-0.5 size-5 rounded-md" />
            <span>
              <span className="block text-[15px] font-medium">Sign out other devices</span>
              <Sub>{whoNeedsIt}</Sub>
            </span>
          </label>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
        </SheetBody>
        <SheetFooter>
          <button type="button" onClick={onClose} className={pill.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={!ready || pending} className={cn(pill.primary, "flex-1")}>
            {pending ? "Changing…" : "Change password"}
          </button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}

/** Disconnect Google (screen 9i): says which account, and that the password is the way in now. */
function DisconnectSheet({
  open,
  email,
  onClose,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function disconnect() {
    startTransition(async () => {
      const result = await run(disconnectGoogleAction({}), { success: "Google disconnected." });
      if (!result.ok) return;
      onClose();
      router.refresh();
    });
  }
  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <SheetHeader title="Disconnect Google?" />
      <SheetBody className="flex flex-col gap-2">
        <p className="text-[15px] leading-relaxed">
          You&apos;ll stop signing in with <b className="font-semibold">{email}</b> on Google.
        </p>
        <p className="text-[14px] leading-relaxed text-dash-ink-soft">
          From now on, sign in with your email and password. Your tasks, money and journal stay
          exactly as they are.
        </p>
      </SheetBody>
      <SheetFooter>
        <button type="button" onClick={onClose} className={pill.secondary}>
          Cancel
        </button>
        <button
          type="button"
          onClick={disconnect}
          disabled={pending}
          className={cn(pill.danger, "flex-1")}
        >
          {pending ? "Disconnecting…" : "Disconnect Google"}
        </button>
      </SheetFooter>
    </Sheet>
  );
}
