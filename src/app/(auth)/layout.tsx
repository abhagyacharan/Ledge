import { Brand, BrandTile, Wordmark } from "@/components/shell/brand";
import { GrainGradient, randomGradient } from "@/components/shell/grain-gradient";

/**
 * The contents page of the book: what Ledge holds today and what joins it later. Real text (it is
 * the one place that says what the app is for), not decoration. Keep it in step with the module
 * registry and docs/ideas.md; "Later" items are intentions, not promises.
 */
const CONTENTS = [
  { name: "Tasks", status: "Ready" },
  { name: "Expense Tracker", status: "Ready" },
  { name: "Journal", status: "Ready" },
  { name: "Reminders", status: "Later" },
  { name: "Health", status: "Later" },
] as const;

function Contents() {
  return (
    <section aria-labelledby="ledge-contents" className="max-w-md">
      <p id="ledge-contents" className="label-caps text-[#f2f4f1]/60">
        Contents
      </p>
      <ol className="mt-3 border-t border-[#f2f4f1]/15">
        {CONTENTS.map((item, i) => {
          const open = item.status === "Ready";
          return (
            <li
              key={item.name}
              className="flex items-baseline gap-3 border-b border-[#f2f4f1]/15 py-2.5 text-sm"
            >
              <span className="w-5 font-mono text-xs text-[#f2f4f1]/60 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={open ? "font-medium text-[#f2f4f1]" : "text-[#f2f4f1]/70"}>
                {item.name}
              </span>
              <span
                aria-hidden
                className="mb-1 flex-1 border-b border-dotted border-[#f2f4f1]/25"
              />
              <span
                className={
                  open
                    ? "flex items-center gap-1.5 font-mono text-xs text-[#f2f4f1]"
                    : "font-mono text-xs text-[#f2f4f1]/60"
                }
              >
                {open ? (
                  <span aria-hidden className="size-1.5 rounded-full bg-dash-accent" />
                ) : null}
                {item.status}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Sign in and sign up (docs/design.md §5g). Wide screens: the cover of the book on the left (always
 * the dark green-black, in both themes): the logo, what Ledge is, and its contents page. On the
 * right, the form on a card over a grainy green and orange gradient that is different on every
 * visit. Phones: the gradient fills the screen.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const layers = randomGradient();

  return (
    <div className="grid min-h-svh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between gap-12 bg-[#121514] p-10 text-[#f2f4f1] [--dash-accent:#f58445] md:flex lg:p-14">
        <Brand size="lg" />
        <div className="max-w-md">
          <p className="label-caps text-[#9fdcb9]">The everyday ledger</p>
          <p className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
            One book for the things you keep track of.
          </p>
          <p className="mt-5 text-base text-[#f2f4f1]/80">
            Ledge comes from ledger, the book where you write things down so nothing slips. It
            starts with your tasks and your money, and more of everyday life joins it over time.
          </p>
        </div>
        <Contents />
      </aside>

      <div className="relative isolate flex flex-col overflow-hidden bg-[#1f6b4a]">
        <GrainGradient layers={layers} className="-z-10" />
        <main className="flex flex-1 flex-col justify-center px-4 py-10 md:px-10">
          {/* Phones have no cover panel, so the logo stands on its own above the card, side by side:
              the app icon tile (the same picture as the home-screen icon) at 48px, where the mark
              inside is 24px tall, then the wordmark at 1px per unit so its capitals are 24px too. */}
          <div className="mb-7 flex items-center justify-center gap-3 md:hidden">
            <BrandTile className="size-12 drop-shadow-[0_10px_22px_rgb(0_0_0/0.35)]" />
            <Wordmark className="h-8 w-[92px] text-[#f2f4f1] drop-shadow-[0_1px_8px_rgb(0_0_0/0.35)]" />
          </div>
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-card p-6 text-card-foreground shadow-[0_30px_80px_-24px_rgb(0_0_0/0.55)] sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
