import type { Metadata } from "next";
import { SearchButton } from "@/components/shell/search-button";
import { todayIn } from "@/lib/dates";
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
import { requireUser } from "@/server/session";

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

/**
 * The journal (docs/journal-spec.md): one page per day. `?d=` picks the day; no `d` is today.
 * The day's facts come from Tasks and Expenses; the page and mood are the user's own words.
 */
export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const { userId } = await requireUser();
  const [settings, params] = await Promise.all([getUserSettings(userId), searchParams]);
  const today = todayIn(settings.timezone);
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
    <div className="dash mx-auto w-full max-w-4xl pb-24">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between md:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Journal</h1>
        <div className="flex items-center gap-2">
          <DayControl
            day={date}
            today={today}
            weekStartsOn={settings.weekStartsOn}
            locale={settings.locale}
            marked={marked}
          />
          <SearchButton />
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
      />
    </div>
  );
}
