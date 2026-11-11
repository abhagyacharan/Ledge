import {
  BookOpen,
  Briefcase,
  Code,
  Dumbbell,
  GraduationCap,
  Heart,
  House,
  Lightbulb,
  List,
  Music,
  Palette,
  Plane,
  Receipt,
  ShoppingCart,
  Sprout,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { createElement, type SVGProps } from "react";

/**
 * List icons (docs/design.md §8): minimal black-and-white line icons, never colour emojis. A list
 * stores the icon's key ("house"); anything else (an old emoji, nothing) shows the plain list icon.
 */
export const LIST_ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "house", label: "Home", icon: House },
  { key: "briefcase", label: "Work", icon: Briefcase },
  { key: "sprout", label: "Growth", icon: Sprout },
  { key: "receipt", label: "Bills", icon: Receipt },
  { key: "wallet", label: "Money", icon: Wallet },
  { key: "book-open", label: "Reading", icon: BookOpen },
  { key: "graduation-cap", label: "Study", icon: GraduationCap },
  { key: "dumbbell", label: "Fitness", icon: Dumbbell },
  { key: "heart", label: "Health", icon: Heart },
  { key: "plane", label: "Travel", icon: Plane },
  { key: "shopping-cart", label: "Shopping", icon: ShoppingCart },
  { key: "lightbulb", label: "Ideas", icon: Lightbulb },
  { key: "target", label: "Goals", icon: Target },
  { key: "palette", label: "Creative", icon: Palette },
  { key: "code", label: "Code", icon: Code },
  { key: "music", label: "Music", icon: Music },
];

/** The emojis the app used to offer, and the line icon each one became (migration 0008). */
export const EMOJI_TO_ICON: Record<string, string> = {
  "🏠": "house",
  "💼": "briefcase",
  "🌱": "sprout",
  "🧾": "receipt",
  "📚": "book-open",
  "💪": "dumbbell",
  "✈️": "plane",
  "🛒": "shopping-cart",
  "💡": "lightbulb",
  "🎯": "target",
  "🎨": "palette",
  "❤️": "heart",
};

export function listIcon(key: string | null | undefined): LucideIcon {
  return LIST_ICONS.find((i) => i.key === key)?.icon ?? List;
}

/** A list's icon as an element (decorative: always hidden from screen readers). */
export function ListGlyph({
  icon,
  ...props
}: { icon: string | null | undefined } & SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return createElement(listIcon(icon), { "aria-hidden": true, strokeWidth: 1.85, ...props });
}
