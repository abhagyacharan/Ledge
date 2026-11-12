import {
  CalendarDays,
  ChartPie,
  CircleCheckBig,
  LayoutGrid,
  Landmark,
  ListChecks,
  ListTodo,
  NotebookPen,
  ReceiptIndianRupee,
  Sun,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { TodoGlobal } from "@/modules/todos/components/todo-global";
import { TodoSidebarSection } from "@/modules/todos/components/sidebar-section";

/**
 * Module registry (CLAUDE.md §4). The sidebar, the phone tab bar and the command palette all
 * render from this list, so adding a module means adding an entry here, not editing the shell.
 * Order matters: modules appear in this order everywhere.
 */
export type NavItem = {
  label: string;
  route: string;
  icon: LucideIcon;
};

export type AppModule = {
  id: string;
  label: string;
  /** A shorter name for the phone tab bar, where five tabs share the width. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Where the module's own entry (and the phone tab) goes. */
  route: string;
  enabled: boolean;
  /**
   * The module's views, shown under it in the sidebar and as the tabs on its pages. Empty for a
   * single-page module, which the sidebar shows as one plain link.
   */
  nav: NavItem[];
  /** Whether a path belongs to this module (marks its sidebar entry and phone tab as current). */
  owns: (pathname: string) => boolean;
  /** Extra sidebar block rendered under the module's views (the tasks module adds its lists). */
  SidebarSection?: ComponentType;
  /** Always-mounted UI for the module, such as the quick-add button. Rendered in the app layout. */
  Global?: ComponentType;
};

export const TASK_ROUTES = ["/tasks", "/today", "/upcoming", "/all", "/completed", "/lists"];

export const modules: AppModule[] = [
  {
    id: "todos",
    label: "Tasks",
    icon: ListChecks,
    route: "/tasks",
    enabled: true,
    nav: [
      { label: "Overview", route: "/tasks", icon: LayoutGrid },
      { label: "Today", route: "/today", icon: Sun },
      { label: "Upcoming", route: "/upcoming", icon: CalendarDays },
      { label: "All tasks", route: "/all", icon: ListTodo },
      { label: "Completed", route: "/completed", icon: CircleCheckBig },
    ],
    owns: (path) => TASK_ROUTES.some((r) => path === r || path.startsWith(`${r}/`)),
    SidebarSection: TodoSidebarSection,
    Global: TodoGlobal,
  },
  {
    id: "expenses",
    label: "Expense Tracker",
    shortLabel: "Expenses",
    icon: Wallet,
    route: "/expenses",
    enabled: true,
    nav: [
      { label: "Summary", route: "/expenses", icon: ChartPie },
      { label: "Income", route: "/expenses/income", icon: Wallet },
      { label: "EMIs & loans", route: "/expenses/emis", icon: Landmark },
      { label: "Expenses", route: "/expenses/spending", icon: ReceiptIndianRupee },
      { label: "Investments", route: "/expenses/investments", icon: TrendingUp },
    ],
    owns: (path) => path === "/expenses" || path.startsWith("/expenses/"),
  },
  {
    // One page per day with the day's facts (docs/journal-spec.md). It took the Blog
    // placeholder's place (O, 2026-11-12); posting to a blog is parked in docs/ideas.md.
    id: "journal",
    label: "Journal",
    icon: NotebookPen,
    route: "/journal",
    enabled: true,
    nav: [],
    owns: (path) => path === "/journal" || path.startsWith("/journal/"),
  },
];

export function enabledModules(): AppModule[] {
  return modules.filter((m) => m.enabled);
}

/** Exact match for a module's home view, prefix match for the rest ("/lists/x" is under Tasks). */
export function isCurrent(route: string, pathname: string, home: string): boolean {
  if (route === home) return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}
