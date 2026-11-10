import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskGroups } from "@/modules/todos/components/task-groups";
import type { TagsById } from "@/modules/todos/components/types";
import { UrlViewControls } from "@/modules/todos/components/url-view-controls";
import { loadDateContext } from "@/modules/todos/date-context";
import { id as uuid } from "@/modules/todos/schema";
import { applyView } from "@/modules/todos/view-logic";
import {
  DEFAULT_VIEW_SETTINGS,
  settingsFromSearchParams,
  type ViewSettings,
} from "@/modules/todos/view-settings";
import { getInbox } from "@/server/data/lists";
import { getTag, listTags } from "@/server/data/tags";
import { getTaggedTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tag" };

const BASE: ViewSettings = { ...DEFAULT_VIEW_SETTINGS, sort: "due" };

export default async function TagPage({ params, searchParams }: PageProps<"/tags/[tagId]">) {
  const { userId } = await requireUser();
  const [{ tagId }, query] = await Promise.all([params, searchParams]);

  const parsed = uuid.safeParse(tagId);
  if (!parsed.success) notFound();
  const tag = await getTag(userId, parsed.data);
  if (!tag) notFound(); // someone else's tag looks exactly like a missing one

  const [{ ctx }, inbox, tags, tasks] = await Promise.all([
    loadDateContext(userId),
    getInbox(userId),
    listTags(userId),
    getTaggedTasks(userId, tag.id),
  ]);
  const settings = settingsFromSearchParams(query, BASE);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));
  const groups = applyView(tasks, settings, ctx, tagsById);

  return (
    <>
      <PageHeader title={`#${tag.name}`} description="Every task with this tag, in every list." />
      <div className="mb-3 flex justify-end">
        <UrlViewControls settings={settings} base={BASE} tags={tags} />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={tasks.length === 0 ? "No tasks with this tag" : "No tasks match this view"}
          hint={
            tasks.length === 0
              ? "Add one below, or open any task and add this tag to it."
              : "Change or reset the view to see more."
          }
        />
      ) : (
        <TaskGroups groups={groups} allTasks={tasks} tagsById={tagsById} ctx={ctx} />
      )}

      <div className="mt-6">
        <InlineAdd listId={inbox.id} tagIds={[tag.id]} label={`Add a task tagged ${tag.name}`} />
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof query.task === "string" ? query.task : undefined}
        ctx={ctx}
      />
    </>
  );
}
