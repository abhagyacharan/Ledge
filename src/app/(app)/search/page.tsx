import { Check, SearchX, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Highlight } from "@/components/dash/highlight";
import { SectionCard } from "@/components/dash/page-title";
import { formatRowDay, isOverdue, todayIn } from "@/lib/dates";
import { searchWords, snippet, matches } from "@/lib/search-text";
import { cn } from "@/lib/utils";
import { KIND_LABELS, KIND_ROUTES } from "@/modules/expenses/categories";
import { money } from "@/modules/expenses/components/summary-sum";
import { loadMoneyContext } from "@/modules/expenses/context";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { loadDateContext } from "@/modules/todos/date-context";
import { searchEntries } from "@/server/data/finance";
import { searchTasks, type ViewTask } from "@/server/data/views";
import type { FinanceEntry } from "@/server/db/schema";
import { requireUser } from "@/server/session";
import { RecentSearches, SearchInput } from "./search-input";

export const metadata: Metadata = { title: "Search" };

type Scope = "all" | "tasks" | "money";

/**
 * Search everything (docs/new_design.md screens 5a and 5b, CLAUDE.md §6.2): tasks by title and
 * notes, and money entries by name, notes, lender, platform or category. The words are in the
 * address (?q=), and ?in= narrows to tasks or money. Matches are bold and underlined; a match
 * found only in the notes shows a piece of the note.
 */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { userId } = await requireUser();
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const q = raw.trim().slice(0, 200);
  const scope: Scope = params.in === "tasks" || params.in === "money" ? params.in : "all";
  const [{ ctx, timeZone }, moneyCtx, tasks, entries] = await Promise.all([
    loadDateContext(userId),
    loadMoneyContext(userId),
    q ? searchTasks(userId, q) : Promise.resolve([]),
    q ? searchEntries(userId, q) : Promise.resolve([]),
  ]);
  const words = searchWords(q);
  const fmt = { currency: moneyCtx.currency, locale: moneyCtx.locale };
  const total = tasks.length + entries.length;
  const chip = (to: Scope, label: string, count: number) => {
    const on = scope === to;
    const query = new URLSearchParams({ q, ...(to === "all" ? {} : { in: to }) });
    return (
      <li key={to}>
        <Link
          href={`/search?${query.toString()}`}
          aria-current={on ? "page" : undefined}
          className={cn(
            "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:h-9 md:text-[13px]",
            on
              ? "bg-dash-ink font-semibold text-dash-card"
              : "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
          )}
        >
          {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
          {label} {count}
        </Link>
      </li>
    );
  };

  return (
    <div className="dash mx-auto w-full max-w-[760px]">
      <h1 className="sr-only">Search</h1>
      <SearchInput key={q} defaultValue={q} />

      {!q ? (
        <section className="mt-4 rounded-2xl border border-dash-edge bg-dash-card p-4 shadow-(--dash-card-shadow) md:p-5">
          <p className="text-[14px] text-dash-ink-soft">
            Searches task titles and notes, and money entries.
          </p>
          <RecentSearches />
        </section>
      ) : total === 0 ? (
        <section className="mt-4 flex flex-col items-center rounded-2xl border border-dash-edge bg-dash-card px-4 py-10 text-center shadow-(--dash-card-shadow)">
          <span
            aria-hidden
            className="mb-3 grid size-12 place-items-center rounded-full bg-dash-well text-dash-ink"
          >
            <SearchX className="size-5" strokeWidth={1.75} />
          </span>
          <p role="status" className="font-display text-lg font-semibold text-balance">
            Nothing matches &ldquo;{q}&rdquo;
          </p>
          <p className="mt-1 text-sm text-dash-ink-soft">
            Check the spelling, or look in Trash for deleted items.
          </p>
          <Link
            href="/trash"
            className="mt-4 inline-flex h-11 items-center rounded-full border border-dash-edge bg-dash-card px-4 text-[14px] font-medium outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
          >
            Open Trash
          </Link>
        </section>
      ) : (
        <>
          <ul aria-label="Show results from" className="mt-4 flex flex-wrap gap-2">
            {chip("all", "All", total)}
            {chip("tasks", "Tasks", tasks.length)}
            {chip("money", "Money", entries.length)}
          </ul>
          <p role="status" className="sr-only">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} and {entries.length}{" "}
            {entries.length === 1 ? "money entry" : "money entries"} for {q}
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {scope !== "money" && tasks.length > 0 ? (
              <SectionCard id="search-tasks" heading={`Tasks · ${tasks.length}`}>
                <ul className="flex flex-col divide-y divide-dash-edge">
                  {tasks.map((t) => (
                    <TaskResult
                      key={t.id}
                      task={t}
                      words={words}
                      href={`/search?${new URLSearchParams({ q, ...(scope === "all" ? {} : { in: scope }), task: t.id }).toString()}`}
                      today={ctx.today}
                      timeNow={ctx.timeNow}
                      locale={ctx.locale}
                      timeZone={timeZone}
                    />
                  ))}
                </ul>
              </SectionCard>
            ) : null}
            {scope !== "tasks" && entries.length > 0 ? (
              <SectionCard id="search-money" heading={`Money · ${entries.length}`}>
                <ul className="flex flex-col divide-y divide-dash-edge">
                  {entries.map((e) => (
                    <EntryResult
                      key={e.id}
                      entry={e}
                      q={q}
                      words={words}
                      fmt={fmt}
                      today={ctx.today}
                    />
                  ))}
                </ul>
              </SectionCard>
            ) : null}
          </div>
        </>
      )}

      <TaskDrawerHost
        userId={userId}
        taskParam={typeof params.task === "string" ? params.task : undefined}
        ctx={ctx}
      />
    </div>
  );
}

function TaskResult({
  task,
  words,
  href,
  today,
  timeNow,
  locale,
  timeZone,
}: {
  task: ViewTask;
  words: string[];
  href: string;
  today: string;
  timeNow: string;
  locale: string;
  timeZone: string;
}) {
  const done = task.status === "done";
  const late = !done && isOverdue(task, today, timeNow);
  const noteBit = !matches(task.title, words) && task.notes ? snippet(task.notes, words) : null;
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="-mx-2 flex min-h-14 flex-col justify-center rounded-xl px-2 py-2.5 outline-none transition-colors duration-150 hover:bg-dash-well/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className={cn(
            "text-[15px] break-words md:text-sm",
            done && "text-dash-ink-soft line-through decoration-dash-ink-soft/60",
          )}
        >
          <Highlight text={task.title} words={words} />
          {done ? <span className="sr-only"> (done)</span> : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-dash-ink-soft">
          {late ? (
            <span className="inline-flex items-center gap-1 font-semibold text-dash-bad">
              <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
              Overdue
            </span>
          ) : null}
          {done && task.completedAt ? (
            <span>
              Done{" "}
              {formatRowDay(todayIn(timeZone, task.completedAt), today, locale).replace(
                /^\S+ /,
                "",
              )}
            </span>
          ) : null}
          {noteBit ? (
            <span className="min-w-0">
              Notes: &ldquo;
              <Highlight text={noteBit} words={words} />
              &rdquo;
            </span>
          ) : null}
          <span>{task.listName}</span>
        </span>
      </Link>
    </li>
  );
}

/** One money entry: opens its area, in its month, filtered by the search words. */
function EntryResult({
  entry,
  q,
  words,
  fmt,
  today,
}: {
  entry: FinanceEntry;
  q: string;
  words: string[];
  fmt: { currency: string; locale: string };
  today: string;
}) {
  const query = new URLSearchParams({
    y: entry.entryDate.slice(0, 4),
    m: String(Number(entry.entryDate.slice(5, 7))),
    q,
  });
  const noteBit = !matches(entry.title, words) && entry.notes ? snippet(entry.notes, words) : null;
  const kindName = entry.kind === "expense" ? "Expense" : KIND_LABELS[entry.kind].tab;
  return (
    <li>
      <Link
        href={`${KIND_ROUTES[entry.kind]}?${query.toString()}`}
        className="-mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2.5 outline-none transition-colors duration-150 hover:bg-dash-well/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] break-words md:text-sm">
            <Highlight text={entry.title} words={words} />
          </span>
          <span className="mt-0.5 block text-xs text-dash-ink-soft">
            {kindName} · {formatRowDay(entry.entryDate, today, fmt.locale).replace(/^\S+ /, "")}
            {noteBit ? (
              <>
                {" "}
                · Notes: &ldquo;
                <Highlight text={noteBit} words={words} />
                &rdquo;
              </>
            ) : (
              <> · {entry.category}</>
            )}
          </span>
        </span>
        <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
          {money(entry.amountMinor, fmt)}
        </span>
      </Link>
    </li>
  );
}
