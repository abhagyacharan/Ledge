import {
  CalendarDays,
  CircleCheckBig,
  Inbox,
  ListChecks,
  ListTodo,
  Sun,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { QuickAdd } from "@/modules/todos/components/quick-add";
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
    ],
    SidebarSection: TodoSidebarSection,
    Global: QuickAdd,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: Wallet,
    route: "/expenses",
    enabled: false, // awaiting spec (CLAUDE.md §7)
    section: "modules",
  },
];

export function enabledModules(section: AppModule["section"]): AppModule[] {
  return modules.filter((m) => m.enabled && m.section === section);
}

export function navItemsFor(module: AppModule): NavItem[] {
  return module.nav ?? [{ label: module.label, route: module.route, icon: module.icon }];
}
