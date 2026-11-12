import { ArrowRight, ListChecks, Wallet, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Home" };

/**
 * Where you land after signing in (docs/design.md §5e): a short greeting and the two things you
 * most often come to do. "Add a task" opens quick add on the Tasks overview; "Log a transaction"
 * opens the Log a transaction menu on the Expense Summary (both through `?add=`).
 */
export default async function HomePage() {
  const { user } = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] ?? "";

  return (
    <div className="dash mx-auto flex min-h-[60svh] max-w-2xl flex-col justify-center gap-8 py-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="mt-2 text-base text-dash-ink-soft">
          Want to add a task or update your expenses?
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice
          href="/tasks?add=task"
          icon={ListChecks}
          title="Tasks"
          action="Add a task"
          detail="Opens your Tasks overview with a new task ready to type."
        />
        <Choice
          href="/expenses?add=transaction"
          icon={Wallet}
          title="Expenses"
          action="Log a transaction"
          detail="Opens your Expense Summary with income, expense, EMI or investment to pick."
        />
      </div>
    </div>
  );
}

function Choice({
  href,
  icon: Icon,
  title,
  action,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  action: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-2xl border border-dash-edge bg-dash-card p-5 text-dash-ink shadow-(--dash-card-shadow) outline-none transition-[transform,box-shadow] duration-150 ease-snap hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.99] motion-reduce:hover:translate-y-0 md:rounded-3xl md:p-6"
    >
      <span
        aria-hidden
        className="grid size-11 place-items-center rounded-full bg-dash-well transition-colors duration-150 group-hover:bg-dash-accent group-hover:text-white"
      >
        <Icon className="size-5" strokeWidth={1.85} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-xl font-semibold">{title}</span>
        <span className="text-sm text-dash-ink-soft">{detail}</span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium">
        {action}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-150 ease-snap group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
