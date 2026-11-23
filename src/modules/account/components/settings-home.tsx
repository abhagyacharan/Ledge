import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ABOUT_SECTION, GROUPS, SETTINGS_SECTIONS } from "../sections";
import { Avatar, GroupLabel, RowIcon, rowClass, settingsCard } from "./ui";
import { SignOutRow } from "./settings-nav";

/**
 * The phone settings home (screen 9a): the profile card (the way into Account), the sections as
 * grouped rows with a short live summary each, About as a quiet footer row and Sign out at the
 * very bottom. There is no tab bar on Settings (O, 2026-11-23), so "‹ Home" leads back.
 */
export function SettingsHome({
  user,
  summaries,
  version,
}: {
  user: { name: string; email: string; image: string | null };
  /** The short line at the end of each row, by section id. */
  summaries: Partial<Record<string, ReactNode>>;
  version: string;
}) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      <Link
        href="/"
        className="-ml-2 inline-flex h-11 w-fit items-center gap-0.5 rounded-full pr-3 pl-1 text-[15px] font-medium text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft aria-hidden className="size-5" />
        Home
      </Link>
      <h1 className="mb-2 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-dash-ink">
        Settings
      </h1>
      <Link
        href="/settings/account"
        className={cn(
          settingsCard,
          "flex items-center gap-3.5 rounded-3xl p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        <Avatar image={user.image} name={user.name} className="size-14 text-lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">{user.name}</span>
          <span className="block truncate text-[13px] text-dash-ink-soft">{user.email}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-dash-ink-soft" />
        <span className="sr-only">Account</span>
      </Link>
      {GROUPS.map((group) => (
        <section key={group} aria-label={group} className="flex flex-col gap-2">
          <GroupLabel>{group}</GroupLabel>
          <div className={settingsCard}>
            {SETTINGS_SECTIONS.filter((s) => s.group === group && s.id !== "account").map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className={cn(
                  rowClass,
                  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  s.danger && "text-dash-bad",
                )}
              >
                <RowIcon className={s.danger ? "bg-dash-bad-bg text-dash-bad" : undefined}>
                  <s.icon />
                </RowIcon>
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {summaries[s.id] ? (
                  <span className="shrink-0 text-[13px] font-normal text-dash-ink-soft">
                    {summaries[s.id]}
                  </span>
                ) : null}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      <Link
        href={ABOUT_SECTION.href}
        className="mt-1.5 flex min-h-11 items-center gap-2.5 rounded-xl px-4 text-[13px] text-dash-ink-soft outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ABOUT_SECTION.icon aria-hidden className="size-4" />
        About Ledge
        <span className="ml-auto font-mono text-[12px] font-medium">{version}</span>
      </Link>
      <SignOutRow />
    </div>
  );
}
