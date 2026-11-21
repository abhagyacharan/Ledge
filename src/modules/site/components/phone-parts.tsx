import {
  ArrowUpRight,
  BatteryFull,
  Check,
  CircleCheck,
  IndianRupee,
  Signal,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Small pieces of the app for the public site's illustrations (the steps, Before and With Ledge),
 * plus the real screenshots the phone and laptop mockups show.
 */

export function StatusBar() {
  return (
    <div className="sbar">
      <span>9:41</span>
      <span className="ic" aria-hidden>
        <Signal className="i s" />
        <BatteryFull className="i" />
      </span>
    </div>
  );
}

export const TAB_NAMES = ["Home", "Tasks", "Expenses", "Journal"] as const;

export function TaskRow({
  name,
  done,
  high,
  meta,
}: {
  name: string;
  done?: boolean;
  high?: boolean;
  meta?: ReactNode;
}) {
  return (
    <div className="trow">
      <span className={`chk${high ? " hi" : ""}${done ? " done" : ""}`}>
        {done ? <Check className="i xs" aria-hidden /> : null}
      </span>
      <div>
        <div className={`t-name${done ? " done" : ""}`}>{name}</div>
        {meta ? <div className="t-meta">{meta}</div> : null}
      </div>
    </div>
  );
}

export function Overdue({ days = 2 }: { days?: number }) {
  return (
    <span className="bad">
      <TriangleAlert className="i xs" aria-hidden />
      Overdue · {days} days
    </span>
  );
}

export function Fact({ icon, children }: { icon: "done" | "spent"; children: ReactNode }) {
  const Icon = icon === "done" ? CircleCheck : IndianRupee;
  return (
    <div className="fact">
      <Icon className="i s" aria-hidden />
      <span>{children}</span>
      <ArrowUpRight className="i s go" aria-hidden />
    </div>
  );
}

export const MOODS = ["Rough", "Low", "Okay", "Good", "Great"] as const;

export function Moods({ pick = "Good", only }: { pick?: string; only?: readonly string[] }) {
  return (
    <div className="moods">
      {(only ?? MOODS).map((m) => (
        <span key={m} className={`mood${m === pick ? " on" : ""}`}>
          {m === pick ? <Check className="i xs" aria-hidden /> : null}
          {m}
        </span>
      ))}
    </div>
  );
}

export function Saved({ at = "9:52 pm" }: { at?: string }) {
  return (
    <span className="saved">
      <Check className="i xs" aria-hidden />
      Saved {at}
    </span>
  );
}

/** The real app's screens (captured by tests/e2e/site-shots.spec.ts into public/site/). */
export const PHONE_SHOTS = [
  { src: "/site/phone-home.png", alt: "Ledge on a phone: Home, with today's tasks and spending" },
  { src: "/site/phone-tasks.png", alt: "Ledge on a phone: Today, with overdue tasks first" },
  { src: "/site/phone-expenses.png", alt: "Ledge on a phone: the monthly expense summary" },
  { src: "/site/phone-journal.png", alt: "Ledge on a phone: a journal page with the day's facts" },
] as const;

/**
 * Where the tab bar's buttons sit in a phone screenshot, as fractions of the 390 x 724 image
 * (measured when capturing, public/site/phone-tabs.json).
 */
export const SHOT_TABS = [
  { x: 23, width: 66.5 },
  { x: 91.5, width: 66.5 },
  { x: 160, width: 66.5 },
  { x: 228.5, width: 66.5 },
].map((t) => ({
  left: `${(t.x / 390) * 100}%`,
  width: `${(t.width / 390) * 100}%`,
  top: `${(655 / 724) * 100}%`,
  height: `${(50 / 724) * 100}%`,
}));
