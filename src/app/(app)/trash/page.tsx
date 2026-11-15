import { Folder, ListChecks, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/dash/page-title";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, daysBetween, formatRowDay, todayIn } from "@/lib/dates";
import { KIND_LABELS, KIND_ROUTES } from "@/modules/expenses/categories";
import { CategoryIcon } from "@/modules/expenses/category-icons";
import { money } from "@/modules/expenses/components/summary-sum";
import { loadMoneyContext } from "@/modules/expenses/context";
import { EmptyTrashButton, TrashList, type TrashItem } from "@/modules/todos/components/trash-list";
import {
  daysLeftInTrash,
  listTrash,
  maybePurgeTrash,
  TRASH_RETENTION_DAYS,
} from "@/server/data/trash";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Trash" };

/**
 * Trash (docs/new_design.md screen 5c): everything deleted, newest first. Each row says what it is,
 * where it came from, when it was deleted and when it goes for good.
 */
export default async function TrashPage() {
  const { userId } = await requireUser();
  await maybePurgeTrash(userId);
  const [{ lists, tasks: trashedTasks, entries }, ctx] = await Promise.all([
    listTrash(userId),
    loadMoneyContext(userId),
  ]);
  const fmt = { currency: ctx.currency, locale: ctx.locale };

  const now = new Date();
  const today = todayIn(ctx.timeZone, now);
  const shortDay = (iso: string) => formatRowDay(iso, today, ctx.locale).replace(/^\S+ /, "");
  /** "deleted today", "deleted yesterday", "deleted 10 Nov". */
  const deleted = (at: Date | null) => {
    const day = todayIn(ctx.timeZone, at ?? now);
    const ago = daysBetween(day, today);
    return ago === 0
      ? "deleted today"
      : ago === 1
        ? "deleted yesterday"
        : `deleted ${shortDay(day)}`;
  };
  const timing = (at: Date | null) => {
    const left = daysLeftInTrash(at ?? now, now);
    return { daysLeft: left, goneOn: shortDay(addDaysIso(today, left)) };
  };

  /** "today", "yesterday", "3 Nov": when something was deleted. */
  const when = (at: Date | null) => deleted(at).replace(/^deleted /, "");
  const kindName = (kind: (typeof entries)[number]["kind"]) =>
    kind === "expense" ? "Expense" : KIND_LABELS[kind].tab;

  const items: (TrashItem & { at: number })[] = [
    ...lists.map((l) => ({
      kind: "list" as const,
      id: l.id,
      title: l.name,
      extra: `${l.taskCount} ${l.taskCount === 1 ? "task" : "tasks"}`,
      icon: <Folder className="size-[18px]" strokeWidth={1.75} />,
      detail: `List with ${l.taskCount} ${l.taskCount === 1 ? "task" : "tasks"} · ${deleted(l.deletedAt)}`,
      from: `List · ${when(l.deletedAt)}`,
      href: `/lists/${l.id}`,
      ...timing(l.deletedAt),
      at: l.deletedAt?.getTime() ?? 0,
    })),
    ...trashedTasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      icon: <ListChecks className="size-[18px]" strokeWidth={1.75} />,
      detail: `${t.parentTitle ? "Subtask" : "Task"} · from ${t.listName} · ${deleted(t.deletedAt)}`,
      from: `${t.parentTitle ? "Subtask" : "Task"} in ${t.listName} · ${when(t.deletedAt)}`,
      ...timing(t.deletedAt),
      at: t.deletedAt?.getTime() ?? 0,
    })),
    ...entries.map((e) => ({
      kind: "entry" as const,
      id: e.id,
      title: e.title,
      extra: money(e.amountMinor, fmt),
      extraIsMoney: true,
      icon: (
        <CategoryIcon
          kind={e.kind}
          category={e.category}
          className="size-[18px]"
          strokeWidth={1.75}
        />
      ),
      detail: `${kindName(e.kind)} · ${shortDay(e.entryDate)} · ${deleted(e.deletedAt)}`,
      from: `${kindName(e.kind)}, ${shortDay(e.entryDate)} · ${when(e.deletedAt)}`,
      href: `${KIND_ROUTES[e.kind]}?y=${e.entryDate.slice(0, 4)}&m=${Number(e.entryDate.slice(5, 7))}`,
      ...timing(e.deletedAt),
      at: e.deletedAt?.getTime() ?? 0,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="dash">
      <PageTitle
        back={{ href: "/", label: "Home" }}
        title="Trash"
        action={<EmptyTrashButton count={items.length} />}
      />
      <p className="-mt-3 mb-4 text-[14px] text-dash-ink-soft">
        Items are removed for good {TRASH_RETENTION_DAYS} days after they&apos;re deleted.
      </p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dash-edge bg-dash-card shadow-(--dash-card-shadow)">
          <EmptyState
            icon={Trash2}
            title="Trash is empty."
            hint={`Deleted items wait here for ${TRASH_RETENTION_DAYS} days.`}
          />
        </div>
      ) : (
        <TrashList items={items} />
      )}
    </div>
  );
}
