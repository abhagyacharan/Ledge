import type { Metadata } from "next";
import { TasksSettings } from "@/modules/account/components/data-sections";
import { SectionHeader } from "@/modules/account/components/ui";
import { countTasksByList, listArchivedLists } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tasks settings" };

/** Settings › Tasks (screen 9m): archived lists and the way to Trash. */
export default async function TasksSettingsPage() {
  const { userId } = await requireUser();
  const archived = await listArchivedLists(userId);
  const counts = await countTasksByList(
    userId,
    archived.map((l) => l.id),
  );
  return (
    <>
      <SectionHeader title="Tasks" />
      <TasksSettings
        lists={archived.map((l) => ({ id: l.id, name: l.name, tasks: counts.get(l.id) ?? 0 }))}
      />
    </>
  );
}
