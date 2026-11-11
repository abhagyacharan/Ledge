import {
  Award,
  Bath,
  Bitcoin,
  Briefcase,
  Building2,
  Car,
  ChartPie,
  Coins,
  CreditCard,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Layers,
  Lightbulb,
  MonitorSmartphone,
  Percent,
  PiggyBank,
  Repeat,
  RotateCcw,
  Shapes,
  ShoppingBag,
  ShoppingBasket,
  TrendingUp,
  UtensilsCrossed,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { createElement, type SVGProps } from "react";
import type { EntryKind } from "@/server/db/schema";

/**
 * One quiet icon per category, so a row can be recognised before it is read. Icons are always
 * paired with the category name; they never carry meaning on their own.
 */
const ICONS: Record<EntryKind, Record<string, LucideIcon>> = {
  income: {
    Salary: Briefcase,
    Bonus: Award,
    Freelance: Laptop,
    "Interest & dividends": Percent,
    "Rental income": House,
    Gifts: Gift,
    Refunds: RotateCcw,
  },
  emi: {
    "Home loan": House,
    "Vehicle loan": Car,
    "Personal loan": HandCoins,
    "Education loan": GraduationCap,
    "Credit card": CreditCard,
  },
  expense: {
    "Housing & Utilities": Lightbulb,
    "Food & Groceries": ShoppingBasket,
    Transportation: Car,
    Healthcare: HeartPulse,
    "Dining & Entertainment": UtensilsCrossed,
    Shopping: ShoppingBag,
    "Personal Care": Bath,
    "Subscriptions & Tech": MonitorSmartphone,
  },
  investment: {
    "Mutual fund": ChartPie,
    Stocks: TrendingUp,
    "Fixed deposit": Vault,
    "Recurring deposit": Repeat,
    "Retirement (PPF, EPF, NPS)": PiggyBank,
    Gold: Coins,
    Crypto: Bitcoin,
    "Real estate": Building2,
  },
};

const FALLBACK: Record<EntryKind, LucideIcon> = {
  income: Wallet,
  emi: Landmark,
  expense: Shapes,
  investment: Layers,
};

export function categoryIcon(kind: EntryKind, category: string): LucideIcon {
  return ICONS[kind][category] ?? FALLBACK[kind];
}

/** The category's icon as an element (decorative: always hidden from screen readers). */
export function CategoryIcon({
  kind,
  category,
  ...props
}: { kind: EntryKind; category: string } & SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return createElement(categoryIcon(kind, category), { "aria-hidden": true, ...props });
}
