import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListScreen } from "@/modules/todos/components/list-screen";
import { id as uuid } from "@/modules/todos/schema";
import { getList } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "List" };

export default async function ListPage({ params, searchParams }: PageProps<"/lists/[listId]">) {
  const { userId } = await requireUser();
  const [{ listId }, { task }] = await Promise.all([params, searchParams]);

  const parsed = uuid.safeParse(listId);
  if (!parsed.success) notFound();
  const list = await getList(userId, parsed.data);
  if (!list) notFound(); // someone else's list looks exactly like a missing one

  return (
    <ListScreen
      userId={userId}
      list={list}
      taskParam={typeof task === "string" ? task : undefined}
    />
  );
}
