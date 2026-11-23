import { AppMain } from "@/components/shell/app-main";
import { todayIn } from "@/lib/dates";
import { TransactionLauncher } from "@/modules/expenses/components/transaction-launcher";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { enabledModules } from "@/config/modules";
import { TodosProvider } from "@/modules/todos/components/todos-provider";
import { getInbox, listLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { maybePurgeTrash } from "@/server/data/trash";
import { requireUser } from "@/server/session";
import { voiceAvailable } from "@/server/voice";
import { pushConfigured } from "@/server/push";
import { parseReminderDefault } from "@/modules/reminders/schema";
import { VoiceRoot } from "@/modules/voice/components/voice-sheet";
import { JournalAutoLock } from "@/modules/journal/components/journal-lock";
import { journalLock } from "@/server/journal-lock";
import { PlansNavProvider } from "@/modules/planner/components/plans/plans-nav";
import { listActivePlanLinks } from "@/server/data/plans";

/**
 * The signed-in shell (docs/new_design.md §3): the sidebar from tablet width up, the bottom tab bar
 * on phones, and each module's always-mounted UI (the round + button, shortcuts, palette).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Real auth check (the proxy only looks for a cookie).
  const { userId, user } = await requireUser();
  const [inbox, lists, settings, voice, journal, activePlans] = await Promise.all([
    // Erases items that have been in Trash for 30 days (at most once an hour per user).
    maybePurgeTrash(userId).then(() => getInbox(userId)),
    listLists(userId),
    getUserSettings(userId),
    voiceAvailable(userId),
    journalLock(userId),
    listActivePlanLinks(userId),
  ]);
  const defaultReminder = parseReminderDefault(settings.reminderDefault);
  const account = { name: user.name, email: user.email, image: user.image };

  return (
    <TodosProvider
      value={{
        lists,
        inboxId: inbox.id,
        timeZone: settings.timezone,
        locale: settings.locale,
        weekStartsOn: settings.weekStartsOn,
        reminders: {
          available: pushConfigured(),
          morningTime: settings.reminderMorningTime.slice(0, 5),
          defaultChoice: defaultReminder.kind === "none" ? null : defaultReminder,
        },
      }}
    >
      {/* Voice capture (docs/voice-spec.md): hold + to speak. Off without a Groq key. */}
      <VoiceRoot available={voice} currency={settings.currency} locale={settings.locale}>
        <PlansNavProvider plans={activePlans}>
          <SidebarProvider>
            <AppSidebar
              user={account}
              journalLocked={journal.state === "locked" || journal.state === "paused"}
              activePlans={activePlans.length}
            />
            <SidebarInset className="min-w-0 bg-background">
              {/* One transaction sheet for every page (Home's button, quick add's type row). The
              Expense Tracker adds its own launcher with the round button. */}
              <TransactionLauncher
                currency={settings.currency}
                today={todayIn(settings.timezone)}
                button={false}
                listen
              >
                <AppMain>{children}</AppMain>
              </TransactionLauncher>
            </SidebarInset>
            <MobileTabBar />
            {/* Locks the journal whenever the app or tab is hidden (docs/journal-spec.md). */}
            <JournalAutoLock
              on={journal.state !== "off"}
              relock={journal.state === "off" ? "leave" : journal.relock}
            />
            {enabledModules().map((m) => (m.Global ? <m.Global key={m.id} /> : null))}
          </SidebarProvider>
        </PlansNavProvider>
      </VoiceRoot>
    </TodosProvider>
  );
}
