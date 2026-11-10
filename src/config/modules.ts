import {
  CalendarDays,
  CircleCheckBig,
  Inbox,
  ListChecks,
  ListTodo,
  Sun,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { TodoGlobal } from "@/modules/todos/components/todo-global";
import { TodoSidebarSection } from "@/modules/todos/components/sidebar-section";

/**
 * Module registry (CLAUDE.md §4). The sidebar renders from this list, so adding a module
 * means adding an entry here, not editing the shell.
 *
 * - `section: "primary"` items render at the top of the sidebar without a group heading.
 * - `section: "modules"` items render in the "Modules" group, below Lists and Tags.
 * - `enabled: false` hides the module from the sidebar until it is switched on.
 */
export type NavItem = {
  label: string;
  route: string;
  icon: LucideIcon;
};

export type AppModule = {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  enabled: boolean;
  section: "primary" | "modules";
  /** Extra links shown for this module. Defaults to a single item for `route`. */
  nav?: NavItem[];
  /** Extra places the command palette can jump to (not shown in the sidebar). */
  paletteRoutes?: { label: string; route: string }[];
  /** Extra sidebar group rendered under the module's links (for example "Lists"). */
  SidebarSection?: ComponentType;
  /** Always-mounted UI for the module, such as the quick-add button. Rendered in the app layout. */
  Global?: ComponentType;
};

export const modules: AppModule[] = [
  {
    id: "todos",
    label: "Tasks",
    icon: ListChecks,
    route: "/inbox",
    enabled: true,
    section: "primary",
    nav: [
      { label: "Inbox", route: "/inbox", icon: Inbox },
      { label: "Today", route: "/today", icon: Sun },
      { label: "Upcoming", route: "/upcoming", icon: CalendarDays },
      { label: "All tasks", route: "/all", icon: ListTodo },
      { label: "Completed", route: "/completed", icon: CircleCheckBig },
      { label: "Trash", route: "/trash", icon: Trash2 },
    ],
    SidebarSection: TodoSidebarSection,
    Global: TodoGlobal,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Wallet,
    route: "/expenses",
    enabled: true,
    section: "modules",
    // The sidebar shows one "Expenses" entry; the tabs inside are reachable from the palette.
    paletteRoutes: [
      { label: "Expenses: Summary", route: "/expenses" },
      { label: "Expenses: Income", route: "/expenses/income" },
      { label: "Expenses: EMIs & loans", route: "/expenses/emis" },
      { label: "Expenses: Expenses", route: "/expenses/spending" },
      { label: "Expenses: Investments", route: "/expenses/investments" },
    ],
  },
];

export function enabledModules(section: AppModule["section"]): AppModule[] {
  return modules.filter((m) => m.enabled && m.section === section);
}

export function navItemsFor(module: AppModule): NavItem[] {
  return module.nav ?? [{ label: module.label, route: module.route, icon: module.icon }];
}
