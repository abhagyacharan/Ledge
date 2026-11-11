import { Brand } from "@/components/shell/brand";
import { GrainGradient, randomGradient } from "@/components/shell/grain-gradient";

/** One faint ruled row of the sheet: a label, a dotted leader, and an amount. */
function Row({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex items-end gap-2">
      <span className={`h-2 rounded-full bg-current opacity-30 ${label}`} />
      <span className="mb-0.5 h-px flex-1 border-b border-dotted border-current opacity-30" />
      <span className={`h-2 rounded-full bg-current opacity-30 ${amount}`} />
    </div>
  );
}

/**
 * Sign in and sign up (docs/design.md §5g). Wide screens: the cover of the book on the left (always
 * the dark green-black, in both themes) and, on the right, the form on a card over a grainy green
 * and orange gradient that is different on every visit. Phones: the gradient fills the screen.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const layers = randomGradient();

  return (
    <div className="grid min-h-svh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-[#121514] p-10 text-[#f2f4f1] md:flex lg:p-14">
        <Brand size="lg" />
        <div className="max-w-md">
          <p className="label-caps text-[#9fdcb9]">Private and self-hosted</p>
          <p className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
            Your tasks and your money, in one book.
          </p>
          <p className="mt-5 text-base text-[#f2f4f1]/80">
            Ledge runs on your own server. What you write here stays with you.
          </p>
        </div>
        {/* A page of the book: ruled lines, then a total underlined twice. Decoration only. */}
        <div aria-hidden className="max-w-md space-y-4">
          <Row label="w-28" amount="w-16" />
          <Row label="w-40" amount="w-12" />
          <Row label="w-24" amount="w-20" />
          <div className="flex items-end justify-between border-t border-current pt-3 opacity-80">
            <span className="h-2 w-16 rounded-full bg-current" />
            <span className="rule-double pb-1">
              <span className="block h-2 w-24 rounded-full bg-current" />
            </span>
          </div>
        </div>
      </aside>

      <div className="relative isolate flex flex-col overflow-hidden bg-[#1f6b4a]">
        <GrainGradient layers={layers} className="-z-10" />
        <main className="flex flex-1 flex-col justify-center px-4 py-10 md:px-10">
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-card p-6 text-card-foreground shadow-[0_30px_80px_-24px_rgb(0_0_0/0.55)] sm:p-8">
            {/* Phones have no cover panel, so the brand sits at the top of the card. */}
            <Brand className="mb-6 md:hidden" />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
