import { AppMain } from "@/components/shell/app-main";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/app";
import { enabledModules } from "@/config/modules";
import { TodosProvider } from "@/modules/todos/components/todos-provider";
import { getInbox, listLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { listTags } from "@/server/data/tags";
import { maybePurgeTrash } from "@/server/data/trash";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Real auth check (the proxy only looks for a cookie).
  const { userId, user } = await requireUser();
  const [inbox, lists, tags, settings] = await Promise.all([
    // Erases items that have been in Trash for 30 days (at most once an hour per user).
    maybePurgeTrash(userId).then(() => getInbox(userId)),
    listLists(userId),
    listTags(userId),
    getUserSettings(userId),
  ]);

  return (
    <TodosProvider
      value={{
        lists,
        inboxId: inbox.id,
        tags,
        timeZone: settings.timezone,
        locale: settings.locale,
      }}
    >
      <SidebarProvider>
        <AppSidebar user={{ name: user.name, email: user.email }} />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="size-11" aria-label="Open navigation" />
            <span className="font-semibold tracking-tight">{APP_NAME}</span>
          </header>
          <AppMain>{children}</AppMain>
        </SidebarInset>
        {enabledModules("primary").map((m) => (m.Global ? <m.Global key={m.id} /> : null))}
      </SidebarProvider>
    </TodosProvider>
  );
}
