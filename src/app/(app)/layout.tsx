import { AppMain } from "@/components/shell/app-main";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { enabledModules } from "@/config/modules";
import { TodosProvider } from "@/modules/todos/components/todos-provider";
import { getInbox, listLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { maybePurgeTrash } from "@/server/data/trash";
import { requireUser } from "@/server/session";

/**
 * The signed-in shell (docs/design.md §5e): the sidebar from tablet width up, the bottom tab bar
 * on phones, and each module's always-mounted UI (the round + button, shortcuts, palette).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Real auth check (the proxy only looks for a cookie).
  const { userId, user } = await requireUser();
  const [inbox, lists, settings] = await Promise.all([
    // Erases items that have been in Trash for 30 days (at most once an hour per user).
    maybePurgeTrash(userId).then(() => getInbox(userId)),
    listLists(userId),
    getUserSettings(userId),
  ]);
  const account = { name: user.name, email: user.email };

  return (
    <TodosProvider
      value={{
        lists,
        inboxId: inbox.id,
        timeZone: settings.timezone,
        locale: settings.locale,
        weekStartsOn: settings.weekStartsOn,
      }}
    >
      <SidebarProvider>
        <AppSidebar user={account} />
        <SidebarInset className="min-w-0 bg-background">
          <AppMain>{children}</AppMain>
        </SidebarInset>
        <MobileTabBar user={account} />
        {enabledModules().map((m) => (m.Global ? <m.Global key={m.id} /> : null))}
      </SidebarProvider>
    </TodosProvider>
  );
}
