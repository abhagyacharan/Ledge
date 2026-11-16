import type { Metadata } from "next";
import { daysBetween, formatShortDay, todayIn } from "@/lib/dates";
import { journalDay, monthEnd, monthOf, monthStart } from "@/modules/journal/calendar";
import { DayControl } from "@/modules/journal/components/day-control";
import { JournalDay, type ShownFact } from "@/modules/journal/components/journal-day";
import {
  buildDayFacts,
  summaryLine,
  type DayFactsInput,
  type FactKind,
} from "@/modules/journal/day-facts";
import { getDayFactsInput, getJournalDates, getJournalEntry } from "@/server/data/journal";
import { getUserSettings } from "@/server/data/settings";
import { journalLock } from "@/server/journal-lock";
import { requireUser } from "@/server/session";
import {
  JournalLockScreen,
  JournalPrivate,
  LockNowButton,
  TurnOnLockLink,
} from "@/modules/journal/components/journal-lock";

export const metadata: Metadata = { title: "Journal" };

/** Where each fact card leads: the same day, in Tasks or Expenses. */
function factHref(kind: FactKind, date: string, input: DayFactsInput): string {
  const period = `y=${date.slice(0, 4)}&m=${Number(date.slice(5, 7))}&day=${date}`;
  switch (kind) {
    case "tasks":
      return `/completed?day=${date}`;
    case "slipped":
      return "/today";
    case "spent":
      return `/expenses/spending?${period}`;
    case "money":
      if (input.investedMinor > 0) return `/expenses/investments?${period}`;
      if (input.incomeMinor > 0) return `/expenses/income?${period}`;
      return `/expenses/emis?${period}`;
  }
}

/** "Today", "Yesterday", else the weekday and how long ago ("Monday · 4 days ago"). */
function relative(date: string, today: string, locale: string): string {
  const diff = daysBetween(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
  return `${weekday} · ${diff} days ago`;
}

/**
 * The journal (docs/journal-spec.md): one page per day. `?d=` picks the day; no `d` is today.
 * The day's facts come from Tasks and Expenses; the page and mood are the user's own words.
 */
export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const { userId } = await requireUser();
  const [settings, params, lock] = await Promise.all([
    getUserSettings(userId),
    searchParams,
    journalLock(userId),
  ]);
  const today = todayIn(settings.timezone);
  // The lock (docs/journal-spec.md, "Journal lock"): nothing from the journal is read or sent
  // until it is open. `?lock=setup` turns it on (from Settings or the Journal's own button).
  const dateLabel = formatShortDay(today, settings.locale).replace(/,/g, "");
  const choosing = lock.state === "off" && params.lock === "setup";
  if (choosing || lock.state === "locked" || lock.state === "paused") {
    return (
      <JournalLockScreen
        initial={choosing ? "choose" : lock.state === "paused" ? "paused" : "locked"}
        pinLength={lock.state === "off" ? 4 : lock.pinLength}
        until={lock.state === "paused" ? lock.until.toISOString() : undefined}
        dateLabel={dateLabel}
        locale={settings.locale}
      />
    );
  }
  const date = journalDay(params.d, today);
  const month = monthOf(date);

  const [entry, factsInput, marked] = await Promise.all([
    getJournalEntry(userId, date),
    getDayFactsInput(userId, date, settings.timezone),
    getJournalDates(userId, monthStart(month), monthEnd(month)),
  ]);
  const isToday = date === today;
  const fmt = { currency: settings.currency, locale: settings.locale };
  const facts: ShownFact[] = buildDayFacts(factsInput, isToday, fmt).map((fact) => ({
    ...fact,
    href: factHref(fact.kind, date, factsInput),
  }));

  return (
    <JournalPrivate relock={lock.state === "unlocked" ? lock.relock : null}>
      <div className="dash mx-auto w-full max-w-[680px] pb-24">
        <header className="mb-4 flex flex-col md:mb-2">
          <h1 className="sr-only">Journal</h1>
          <div className="flex items-center gap-2">
            {/* The day with its arrows (docs/new_design.md screens 4a and 4d). */}
            <div className="min-w-0 flex-1">
              <DayControl
                day={date}
                today={today}
                weekStartsOn={settings.weekStartsOn}
                locale={settings.locale}
                marked={marked}
              />
            </div>
            {/* Lock now (Ctrl+Shift+L) when the lock is on; otherwise a way to turn it on. */}
            {lock.state === "unlocked" ? <LockNowButton /> : <TurnOnLockLink />}
          </div>
        </header>

        <JournalDay
          key={date}
          date={date}
          isToday={isToday}
          facts={facts}
          summary={summaryLine(facts)}
          initialBody={entry?.body ?? ""}
          initialMood={entry?.mood ?? null}
          savedAt={entry?.updatedAt.toISOString() ?? null}
          locale={settings.locale}
          timeZone={settings.timezone}
          relativeLabel={relative(date, today, settings.locale)}
          longDate={new Intl.DateTimeFormat(settings.locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "UTC",
          }).format(new Date(`${date}T00:00:00Z`))}
        />
      </div>
    </JournalPrivate>
  );
}
