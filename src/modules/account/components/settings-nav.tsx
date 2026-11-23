"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ABOUT_SECTION, currentSection, GROUPS, visibleSections } from "../sections";

const item =
  "flex h-10 w-full items-center gap-2.5 rounded-full px-3 text-[14px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0";

/** Sign out (the bottom of the settings column, and of the phone settings home). */
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error("Couldn't sign out. Try again.");
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }
  return { signOut, pending };
}

/**
 * The settings column with a mouse (screen 9b): "Settings", the sections in their three groups,
 * the chosen one as a well pill, then About and Sign out at the bottom. Hidden on phones, where
 * the settings home lists the sections instead.
 */
export function SettingsNav({ version, pushOn }: { version: string; pushOn: boolean }) {
  const pathname = usePathname();
  const current = currentSection(pathname);
  const { signOut, pending } = useSignOut();
  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-10 hidden w-[220px] shrink-0 flex-col gap-0.5 self-start md:flex"
    >
      <p className="mb-2 px-3 font-display text-[22px] font-semibold text-dash-ink">Settings</p>
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-0.5">
          <p className="px-3 pt-3 pb-1 text-[12px] font-medium text-dash-ink-soft">{group}</p>
          {visibleSections(pushOn)
            .filter((s) => s.group === group)
            .map((s) => {
              const on = current === s.id;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    item,
                    on ? "bg-dash-well font-semibold text-dash-ink" : "hover:bg-dash-well/60",
                    s.danger ? "text-dash-bad" : on ? "" : "text-dash-ink",
                  )}
                >
                  <s.icon aria-hidden />
                  {s.label}
                </Link>
              );
            })}
        </div>
      ))}
      <div className="mt-6 flex flex-col gap-0.5 border-t border-dash-edge pt-3">
        <Link
          href={ABOUT_SECTION.href}
          aria-current={current === "about" ? "page" : undefined}
          className={cn(
            item,
            "text-[13px] text-dash-ink-soft",
            current === "about" ? "bg-dash-well text-dash-ink" : "hover:bg-dash-well/60",
          )}
        >
          <ABOUT_SECTION.icon aria-hidden />
          About
          <span className="ml-auto font-mono text-[11px]">{version}</span>
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className={cn(item, "text-dash-ink hover:bg-dash-well/60 disabled:opacity-60")}
        >
          <LogOut aria-hidden />
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </nav>
  );
}

/** The full-width Sign out row at the very bottom of the phone settings home (screen 9a). */
export function SignOutRow() {
  const { signOut, pending } = useSignOut();
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dash-edge bg-dash-card text-[15px] font-semibold text-dash-ink shadow-(--dash-card-shadow) outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
    >
      <LogOut aria-hidden className="size-4" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
