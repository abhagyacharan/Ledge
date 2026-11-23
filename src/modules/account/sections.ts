import {
  Bell,
  Download,
  Info,
  ListTodo,
  LockKeyhole,
  Mic,
  ShieldCheck,
  SunMoon,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The Settings sections, in order and in their groups (docs/settings-design-prompt.md). Each has
 * its own address; /settings opens Account with a mouse and the settings home on a phone.
 */
export type SettingsSection = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  group: "You" | "App" | "Your data" | null;
  danger?: boolean;
  /** Shown only when the server has push set up (VAPID keys). */
  needsPush?: boolean;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "account", href: "/settings/account", label: "Account", icon: UserRound, group: "You" },
  {
    id: "security",
    href: "/settings/security",
    label: "Sign-in & security",
    icon: ShieldCheck,
    group: "You",
  },
  {
    id: "appearance",
    href: "/settings/appearance",
    label: "Appearance & time",
    icon: SunMoon,
    group: "App",
  },
  { id: "voice", href: "/settings/voice", label: "Voice & AI", icon: Mic, group: "App" },
  {
    id: "journal-lock",
    href: "/settings/journal-lock",
    label: "Journal lock",
    icon: LockKeyhole,
    group: "App",
  },
  { id: "tasks", href: "/settings/tasks", label: "Tasks", icon: ListTodo, group: "App" },
  {
    id: "notifications",
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
    group: "App",
    needsPush: true,
  },
  {
    id: "export",
    href: "/settings/export",
    label: "Reports & export",
    icon: Download,
    group: "Your data",
  },
  {
    id: "delete",
    href: "/settings/delete",
    label: "Delete account",
    icon: Trash2,
    group: "Your data",
    danger: true,
  },
];

export const ABOUT_SECTION: SettingsSection = {
  id: "about",
  href: "/settings/about",
  label: "About",
  icon: Info,
  group: null,
};

/** The sections to show: Notifications only when reminders are set up on the server. */
export function visibleSections(pushOn: boolean): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => pushOn || !s.needsPush);
}

/** Which section an address belongs to; /settings itself is Account (with a mouse). */
export function currentSection(pathname: string): string | null {
  if (pathname === "/settings") return "account";
  const match = [...SETTINGS_SECTIONS, ABOUT_SECTION].find(
    (s) => pathname === s.href || pathname.startsWith(`${s.href}/`),
  );
  return match?.id ?? null;
}

export const GROUPS = ["You", "App", "Your data"] as const;
