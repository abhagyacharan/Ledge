import type { Metadata } from "next";
import { PageTitle } from "@/components/dash/page-title";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { card, CardTitle } from "@/modules/account/card";
import {
  PreferencesCard,
  ReportsCard,
  SectionNav,
  SecurityCard,
} from "@/modules/account/settings-parts";
import { loadMoneyContext } from "@/modules/expenses/context";
import { ArchivedLists } from "@/modules/todos/components/archived-lists";
import { listArchivedLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { getVoiceConfig } from "@/server/env";
import { journalLock } from "@/server/journal-lock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

/**
 * Settings (docs/new_design.md screens 5f and 6g): profile, preferences, reports and exports,
 * archived lists, security and an About line. With a mouse a section list sits beside the cards;
 * on a phone the cards stack under "‹ Home".
 */
export default async function SettingsPage() {
  const { userId, user } = await requireUser();
  const [archived, money, settings] = await Promise.all([
    listArchivedLists(userId),
    loadMoneyContext(userId),
    getUserSettings(userId),
  ]);
  const currencyName =
    new Intl.DisplayNames([settings.locale], { type: "currency" }).of(settings.currency) ??
    settings.currency;
  const symbol =
    new Intl.NumberFormat(settings.locale, { style: "currency", currency: settings.currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? "";
  const localeName =
    new Intl.DisplayNames([settings.locale], { type: "language" }).of(settings.locale) ??
    settings.locale;
  const sample = new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 0,
  }).format(123456);

  return (
    <div className="dash flex gap-8">
      <SectionNav />
      <div className="mx-auto flex w-full max-w-[640px] min-w-0 flex-col gap-3 md:gap-4">
        <PageTitle back={{ href: "/", label: "Home" }} title="Settings" className="mb-1" />

        <section id="profile" aria-label="Profile" className={`${card} py-4`}>
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-dash-ink text-lg font-semibold text-dash-card md:size-14"
            >
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <dl className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-xs text-dash-ink-soft">Name</dt>
                <dd className="mt-0.5 truncate rounded-xl bg-dash-well px-3 py-2 text-[14px] font-medium">
                  {user.name}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-dash-ink-soft">Email</dt>
                <dd className="mt-0.5 truncate rounded-xl bg-dash-well px-3 py-2 text-[14px] font-medium">
                  {user.email}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-3 -ml-2">
            <SignOutButton />
          </div>
        </section>

        <PreferencesCard
          timezone={settings.timezone}
          weekStartsOn={settings.weekStartsOn}
          currencyLabel={`${currencyName} (${symbol})`}
          localeLabel={`${localeName} · ${sample}`}
          voice={getVoiceConfig().enabled ? { enabled: settings.voiceEnabled } : null}
          journalLockOn={(await journalLock(userId)).state !== "off"}
        />

        <ReportsCard thisMonth={money.defaultPeriod} />

        {archived.length > 0 ? (
          <section aria-labelledby="archived-title" className={`${card} pb-3`}>
            <CardTitle id="archived-title">Archived lists</CardTitle>
            <ArchivedLists lists={archived} />
          </section>
        ) : null}

        <SecurityCard />

        <p id="about" className="scroll-mt-6 px-1 text-xs text-dash-ink-soft">
          About · Ledge, the everyday ledger · Your data stays on this server
        </p>
      </div>
    </div>
  );
}
