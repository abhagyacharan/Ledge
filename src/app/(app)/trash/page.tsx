import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
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
  const { lists, tasks: trashedTasks } = await listTrash(userId);

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
  ].sort((a, b) => b.at - a.at);

  return (
    <>
      <PageHeader
        title="Trash"
        description={`Deleted tasks and lists stay here for ${TRASH_RETENTION_DAYS} days, then they are erased for good.`}
      />
      {items.length === 0 ? (
        <EmptyState
          title="The Trash is empty"
          hint="Deleted tasks and lists show up here so you can bring them back."
        />
      ) : (
        <TrashList items={items} />
      )}
    </>
  );
}
