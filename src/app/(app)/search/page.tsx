import type { Metadata } from "next";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import type { TagsById } from "@/modules/todos/components/types";
import { loadDateContext } from "@/modules/todos/date-context";
import { listTags } from "@/server/data/tags";
import { searchTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Search" };

/** Search titles and notes. The query is in the address (?q=), so it works without scripts too. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { userId } = await requireUser();
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const q = raw.trim().slice(0, 200);
  const [{ ctx }, tags, results] = await Promise.all([
    loadDateContext(userId),
    listTags(userId),
    q ? searchTasks(userId, q) : Promise.resolve([]),
  ]);
  const tagsById: TagsById = Object.fromEntries(tags.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader title="Search" description="Find tasks by their title or notes." />
      <form action="/search" role="search" className="mb-6 flex gap-2">
        <div className="flex-1">
          <Label htmlFor="search-input" className="sr-only">
            Search tasks
          </Label>
          <Input
            id="search-input"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search tasks and notes"
            autoComplete="off"
            autoFocus
            maxLength={200}
            className="h-11 md:h-9"
          />
        </div>
        <Button type="submit" className="h-11 gap-1.5 md:h-9">
          <Search aria-hidden /> Search
        </Button>
      </form>

      {!q ? (
        <EmptyState
          title="Search your tasks"
          hint="Type a word and press Enter. Press / anywhere to come back here."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={`Nothing found for "${q}"`}
          hint="Try a shorter word, or the start of one."
        />
      ) : (
        <>
          <p role="status" className="mb-2 text-sm text-muted-foreground">
            {results.length === 100
              ? "The first 100 results"
              : `${results.length} result${results.length === 1 ? "" : "s"}`}{" "}
            for &ldquo;{q}&rdquo;
          </p>
          <TaskList tasks={results} allTasks={results} tagsById={tagsById} ctx={ctx} />
        </>
      )}

      <TaskDrawerHost
        userId={userId}
        taskParam={typeof params.task === "string" ? params.task : undefined}
        ctx={ctx}
      />
    </>
  );
}
