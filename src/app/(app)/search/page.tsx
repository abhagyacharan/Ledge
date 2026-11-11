import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashButton } from "@/components/dash/dash-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { CategoryIcon } from "@/modules/expenses/category-icons";
import { KIND_LABELS, KIND_ROUTES } from "@/modules/expenses/categories";
import { loadMoneyContext } from "@/modules/expenses/context";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { searchEntries } from "@/server/data/finance";
import { searchTasks } from "@/server/data/views";
import type { FinanceEntry } from "@/server/db/schema";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Search" };

/**
 * Search everything (CLAUDE.md §6.2): tasks by title and notes, and Expense Tracker entries by
 * name, notes, lender, platform or category. The query is in the address (?q=), so it works
 * without scripts too. An entry opens its tab and month, already filtered to it.
 */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { userId } = await requireUser();
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const q = raw.trim().slice(0, 200);
  const [{ ctx }, money, tasks, entries] = await Promise.all([
    loadDateContext(userId),
    loadMoneyContext(userId),
    q ? searchTasks(userId, q) : Promise.resolve([]),
    q ? searchEntries(userId, q) : Promise.resolve([]),
  ]);
  const total = tasks.length + entries.length;

  return (
    <div className="dash">
      <PageHeader title="Search" />
      <div className="flex flex-col gap-4">
        <TaskPanel
          id="search"
          title="Search"
          subtitle="Tasks and Expense Tracker entries."
          hideTitle
        >
          <form action="/search" role="search" className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="search-input" className="sr-only">
                Search everything
              </label>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-dash-ink-soft"
              />
              <input
                id="search-input"
                name="q"
                type="search"
                enterKeyHint="search"
                defaultValue={q}
                placeholder="Search tasks and expenses"
                autoComplete="off"
                autoFocus
                maxLength={200}
                className="h-11 w-full rounded-full bg-dash-well pr-4 pl-10 text-base text-dash-ink outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 md:text-sm"
              />
            </div>
            <DashButton type="submit" className="h-11! md:h-10!">
              Search
            </DashButton>
          </form>
          {q ? (
            <p role="status" className="mt-3 text-[13px] text-dash-ink-soft">
              {total === 0
                ? `Nothing found for “${q}”`
                : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} and ${entries.length} ${entries.length === 1 ? "entry" : "entries"} for “${q}”`}
            </p>
          ) : null}
        </TaskPanel>

        {!q ? (
          <TaskPanel id="search-hint" title="Search everything" hideTitle>
            <EmptyState
              icon={Search}
              title="Search tasks and expenses"
              hint="Type a word and press Enter. It looks in task titles and notes, and in expense names, notes, lenders, platforms and categories. Press / anywhere to come back here."
            />
          </TaskPanel>
        ) : total === 0 ? (
          <TaskPanel id="search-none" title="No results" hideTitle>
            <EmptyState
              icon={Search}
              title={`Nothing found for "${q}"`}
              hint="Try a shorter word, or the start of one."
            />
          </TaskPanel>
        ) : (
          <>
            {tasks.length > 0 ? (
              <TaskPanel
                id="search-tasks"
                title="Tasks"
                subtitle={tasks.length === 100 ? "The first 100" : `${tasks.length} found`}
              >
                <TaskList tasks={tasks} allTasks={tasks} ctx={ctx} />
              </TaskPanel>
            ) : null}
            {entries.length > 0 ? (
              <TaskPanel
                id="search-entries"
                title="Expense Tracker"
                subtitle={entries.length === 50 ? "The 50 newest" : `${entries.length} found`}
              >
                <ul className="-mx-2">
                  {entries.map((e) => (
                    <EntryResult key={e.id} entry={e} q={q} money={money} />
                  ))}
                </ul>
              </TaskPanel>
            ) : null}
          </>
        )}
      </div>

      <TaskDrawerHost
        userId={userId}
        taskParam={typeof params.task === "string" ? params.task : undefined}
        ctx={ctx}
      />
    </div>
  );
}

/** One entry: opens its tab, in its month, filtered by the search words. */
function EntryResult({
  entry,
  q,
  money,
}: {
  entry: FinanceEntry;
  q: string;
  money: { currency: string; locale: string };
}) {
  const query = new URLSearchParams({
    y: entry.entryDate.slice(0, 4),
    m: String(Number(entry.entryDate.slice(5, 7))),
    q,
  });
  return (
    <li>
      <Link
        href={`${KIND_ROUTES[entry.kind]}?${query.toString()}`}
        className="flex min-h-15 items-center gap-3 rounded-xl px-2 py-2.5 outline-none transition-colors duration-150 hover:bg-dash-well/70 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink"
        >
          <CategoryIcon
            kind={entry.kind}
            category={entry.category}
            className="size-[18px]"
            strokeWidth={1.75}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{entry.title}</span>
          <span className="block truncate text-[13px] text-dash-ink-soft">
            {KIND_LABELS[entry.kind].tab} · {entry.category} ·{" "}
            {formatDate(entry.entryDate, money.locale)}
          </span>
        </span>
        <span className="figures shrink-0 text-sm font-medium">
          {formatMoney(entry.amountMinor, money.currency, money.locale)}
        </span>
      </Link>
    </li>
  );
}
