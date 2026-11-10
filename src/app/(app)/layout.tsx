import { AppSidebar } from "@/components/shell/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { APP_NAME } from "@/config/app";
import { enabledModules } from "@/config/modules";
import { TodosProvider } from "@/modules/todos/components/todos-provider";
import { getInbox, listLists } from "@/server/data/lists";
import { listTags } from "@/server/data/tags";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Real auth check (the proxy only looks for a cookie).
  const { userId, user } = await requireUser();
  const [inbox, lists, tags] = await Promise.all([
    getInbox(userId),
    listLists(userId),
    listTags(userId),
  ]);

  return (
    <TodosProvider value={{ lists, inboxId: inbox.id, tags }}>
      <SidebarProvider>
        <AppSidebar user={{ name: user.name, email: user.email }} />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="size-11" aria-label="Open navigation" />
            <span className="font-semibold tracking-tight">{APP_NAME}</span>
          </header>
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8 md:py-10">
            {children}
          </main>
        </SidebarInset>
        {enabledModules("primary").map((m) => (m.Global ? <m.Global key={m.id} /> : null))}
      </SidebarProvider>
    </TodosProvider>
  );
}
