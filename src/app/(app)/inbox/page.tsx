import type { Metadata } from "next";
import { ListScreen } from "@/modules/todos/components/list-screen";
import { getInbox } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { userId } = await requireUser();
  const [inbox, { task }] = await Promise.all([getInbox(userId), searchParams]);
  return (
    <ListScreen
      userId={userId}
      list={inbox}
      taskParam={typeof task === "string" ? task : undefined}
    />
  );
}
