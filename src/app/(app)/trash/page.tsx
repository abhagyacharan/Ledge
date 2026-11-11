import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { KIND_LABELS } from "@/modules/expenses/categories";
import { loadMoneyContext } from "@/modules/expenses/context";
import { TaskPanel } from "@/modules/todos/components/task-panel";
import { TrashList, type TrashItem } from "@/modules/todos/components/trash-list";
import {
  daysLeftInTrash,
  listTrash,
  maybePurgeTrash,
  TRASH_RETENTION_DAYS,
} from "@/server/data/trash";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const { userId } = await requireUser();
  await maybePurgeTrash(userId);
  const [{ lists, tasks: trashedTasks, entries }, money] = await Promise.all([
    listTrash(userId),
    loadMoneyContext(userId),
  ]);

  const now = new Date();
  const items: (TrashItem & { at: number })[] = [
    ...lists.map((l) => {
      const n = l.taskCount;
      return {
        kind: "list" as const,
        id: l.id,
        title: l.name,
        icon: l.icon,
        detail: `List with ${n} ${n === 1 ? "task" : "tasks"}`,
        daysLeft: daysLeftInTrash(l.deletedAt ?? now, now),
        at: l.deletedAt?.getTime() ?? 0,
      };
    }),
    ...trashedTasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      icon: null,
      detail: t.parentTitle ? `Subtask of ${t.parentTitle} in ${t.listName}` : `In ${t.listName}`,
      daysLeft: daysLeftInTrash(t.deletedAt ?? now, now),
      at: t.deletedAt?.getTime() ?? 0,
    })),
    ...entries.map((e) => ({
      kind: "entry" as const,
      id: e.id,
      title: e.title,
      icon: null,
      detail: `${KIND_LABELS[e.kind].tab} entry, ${formatDate(e.entryDate, money.locale)}, ${formatMoney(e.amountMinor, money.currency, money.locale)}`,
      daysLeft: daysLeftInTrash(e.deletedAt ?? now, now),
      at: e.deletedAt?.getTime() ?? 0,
    })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="dash">
      <PageHeader title="Trash" />
      <TaskPanel
        id="trash"
        title="Deleted items"
        subtitle={`Tasks, lists and money entries stay here for ${TRASH_RETENTION_DAYS} days, then they are erased for good.`}
      >
        {items.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="The Trash is empty"
            hint="Deleted tasks, lists and entries show up here so you can bring them back."
          />
        ) : (
          <TrashList items={items} />
        )}
      </TaskPanel>
    </div>
  );
}
