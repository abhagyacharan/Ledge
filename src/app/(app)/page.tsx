import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Lock,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { enabledModules, type AppModule } from "@/config/modules";
import { formatShortDay, timeNowIn, todayIn } from "@/lib/dates";
import { minorDigits } from "@/lib/money";
import { HomeActions } from "@/modules/home/home-actions";
import { greeting, tasksHint, tasksSentence, type TaskCounts } from "@/modules/home/hints";
import { monthlyTotals } from "@/server/data/finance";
import { getJournalEntry } from "@/server/data/journal";
import { journalLock } from "@/server/journal-lock";
import { getUserSettings } from "@/server/data/settings";
import { getCompletedTasksOn, getDueByTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

/**
 * Home (docs/new_design.md §3 and screens 1a, 1b, 1e): the date, a greeting, one sentence about
 * today, the two capture buttons, then every module from the registry with one live hint. On a
 * phone Search, Trash and Settings sit underneath as tiles, since the tab bar has no room for them.
 */
export default async function HomePage() {
  const { userId, user } = await requireUser();
  const settings = await getUserSettings(userId);
  const { timezone: timeZone, locale, currency } = settings;
  const today = todayIn(timeZone);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  const [due, done, months, journal, lock] = await Promise.all([
    getDueByTasks(userId, today),
    getCompletedTasksOn(userId, today, timeZone),
    monthlyTotals(userId, year),
    getJournalEntry(userId, today),
    journalLock(userId),
  ]);

  const overdueTasks = due.filter((t) => t.dueDate !== null && t.dueDate < today);
  const counts: TaskCounts = {
    dueToday: due.length - overdueTasks.length,
    overdue: overdueTasks.length,
    doneToday: done.length,
    overdueDate: overdueTasks.length === 1 ? (overdueTasks[0]?.dueDate ?? null) : null,
  };
  const spent = months.find((m) => m.month === month)?.expense ?? 0;
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(Date.UTC(year, month - 1, 15)),
  );
  const spentText = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(spent / 10 ** minorDigits(currency)));
  const writtenAt = journal
    ? new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(
        journal.updatedAt,
      )
    : null;

  const firstName = user.name.trim().split(/\s+/)[0] ?? "";
  const overdueNote =
    counts.overdue > 0 ? (
      <span className="inline-flex items-center gap-1 font-semibold text-dash-bad">
        <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
        {counts.overdue} overdue
      </span>
    ) : null;

  // One hint per module, phone (a line) and desktop (a figure and a line). A module added to the
  // registry later shows up here with no hint until it gets one.
  const hints: Record<string, Hint> = {
    todos: {
      line: (
        <>
          {tasksHint(counts)}
          {overdueNote}
        </>
      ),
      figure: counts.dueToday > 0 ? `${counts.dueToday} due today` : tasksHint(counts),
      sub:
        overdueNote ??
        (counts.doneToday > 0 ? `${counts.doneToday} done today` : "nothing overdue"),
    },
    expenses: {
      line: spent > 0 ? `${spentText} spent in ${monthName}` : `Nothing spent in ${monthName}`,
      figure: <span className="font-mono tabular-nums">{spentText}</span>,
      sub: `spent in ${monthName}`,
    },
    journal: {
      line: writtenAt ? (
        <span className="inline-flex items-center gap-1">
          <Check aria-hidden className="size-3.5 text-dash-good" strokeWidth={2.5} />
          Written today, {writtenAt}
        </span>
      ) : (
        "Not written today"
      ),
      figure: writtenAt ? "Written" : "Not written",
      sub: writtenAt ? `today, ${writtenAt}` : "today’s page is empty",
    },
  };
  const homeModules = enabledModules();
  // While the journal is locked, Home says so and shows only whether today's page is written.
  const journalLocked = lock.state === "locked" || lock.state === "paused";
  const badgeFor = (id: string) => (id === "journal" && journalLocked ? <LockedBadge /> : null);

  return (
    <>
      <div className="dash mx-auto flex max-w-[760px] flex-col md:pt-14">
        <header className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs font-medium text-dash-ink-soft">
              <time dateTime={today}>{formatShortDay(today, locale)}</time>
            </p>
            <Link
              href="/settings"
              aria-label="Settings and account"
              className="grid size-11 place-items-center rounded-full bg-dash-ink text-[15px] font-semibold text-dash-card outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:hidden"
            >
              {user.name.trim().charAt(0).toUpperCase() || "?"}
            </Link>
          </div>
          <h1 className="mt-4 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] text-balance md:mt-2 md:text-[44px] md:leading-[1.05] md:tracking-[-0.02em]">
            {greeting(timeNowIn(timeZone), firstName)}
          </h1>
          <p className="mt-2 text-[15px] text-pretty text-dash-ink-soft md:mt-3">
            {tasksSentence(counts, today)}
          </p>
        </header>

        <div className="mt-5 md:mt-6">
          <HomeActions />
        </div>

        {/* Phone: one card of module rows. */}
        <nav aria-label="Modules" className="mt-4 md:hidden">
          <ul className="rounded-2xl border border-dash-edge bg-dash-card px-3 shadow-(--dash-card-shadow)">
            {homeModules.map((m, i) => (
              <li key={m.id} className={i > 0 ? "border-t border-dash-edge" : undefined}>
                <ModuleRow module={m} hint={hints[m.id]?.line} badge={badgeFor(m.id)} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop: one card per module. */}
        <nav aria-label="Modules" className="mt-8 hidden gap-3 md:grid md:grid-cols-3">
          {homeModules.map((m) => (
            <ModuleCard key={m.id} module={m} hint={hints[m.id]} badge={badgeFor(m.id)} />
          ))}
        </nav>

        {/* Phone: the places that are not tabs. Desktop has them in the sidebar. */}
        <nav aria-label="More" className="mt-2.5 grid grid-cols-3 gap-2.5 md:hidden">
          <Tile href="/search" label="Search" icon={Search} />
          <Tile href="/trash" label="Trash" icon={Trash2} />
          <Tile href="/settings" label="Settings" icon={Settings} />
        </nav>
      </div>
    </>
  );
}

type Hint = { line: ReactNode; figure: ReactNode; sub: ReactNode };

const focusRing =
  "outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)]";

function IconCircle({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-10 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink transition-colors duration-150 ${className ?? ""}`}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** "Locked" beside the Journal's name on Home (screen 7g). */
function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-dash-well px-2 py-0.5 text-[11px] font-medium text-dash-ink-soft">
      <Lock aria-hidden className="size-3" />
      Locked
    </span>
  );
}

function ModuleRow({
  module: m,
  hint,
  badge,
}: {
  module: AppModule;
  hint?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={m.route}
      className={`-mx-3 flex min-h-[70px] items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150 active:bg-dash-well ${focusRing}`}
    >
      <IconCircle icon={m.icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[15px] font-semibold text-dash-ink">
          {m.label}
          {badge}
        </span>
        {hint ? (
          <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-dash-ink-soft">
            {hint}
          </span>
        ) : null}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
    </Link>
  );
}

function ModuleCard({
  module: m,
  hint,
  badge,
}: {
  module: AppModule;
  hint?: Hint;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={m.route}
      className={`group flex min-h-[132px] flex-col rounded-3xl border border-dash-edge bg-dash-card p-5 shadow-(--dash-card-shadow) transition-[transform,background-color] duration-150 ease-snap hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${focusRing}`}
    >
      <span className="flex items-start justify-between">
        {/* The icon turns orange on hover (docs/design.md, welcome page). */}
        <IconCircle
          icon={m.icon}
          className="group-hover:bg-dash-accent group-hover:text-dash-on-accent"
        />
        <ArrowUpRight
          aria-hidden
          className="size-4 text-dash-ink-soft transition-[transform,color] duration-150 ease-snap group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-dash-ink"
        />
      </span>
      <span className="mt-6 flex items-center gap-2 text-[13px] text-dash-ink-soft">
        {m.label}
        {badge}
      </span>
      {hint ? (
        <>
          <span className="mt-1 font-display text-[28px] leading-tight font-semibold tracking-[-0.01em] text-dash-ink">
            {hint.figure}
          </span>
          <span className="mt-1 text-[13px] text-dash-ink-soft">{hint.sub}</span>
        </>
      ) : null}
    </Link>
  );
}

function Tile({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className={`flex h-16 flex-col items-center justify-center gap-1.5 rounded-2xl bg-dash-track text-[13px] font-medium text-dash-ink transition-colors duration-150 active:bg-dash-well ${focusRing}`}
    >
      <Icon aria-hidden className="size-4.5" strokeWidth={1.85} />
      {label}
    </Link>
  );
}
