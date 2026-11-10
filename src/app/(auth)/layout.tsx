import { Brand } from "@/components/shell/brand";

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

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* The cover of the book. Only on wider screens; phones get a slim brand bar instead. */}
      <aside className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex lg:p-14">
        <Brand size="lg" />
        <div className="max-w-md">
          <p className="label-caps text-sidebar-primary">Private and self-hosted</p>
          <p className="mt-4 font-display text-4xl leading-[1.08] font-semibold tracking-tight lg:text-5xl">
            Your tasks and your money, in one book.
          </p>
          <p className="mt-5 text-base text-sidebar-foreground/80">
            Ledge runs on your own server. What you write here stays with you.
          </p>
        </div>
        {/* A page of the book: ruled lines, then a total underlined twice. Decoration only. */}
        <div aria-hidden className="max-w-md space-y-4 text-sidebar-foreground">
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

      <div className="flex flex-col">
        <div className="bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
          <Brand />
        </div>
        <main className="flex flex-1 flex-col justify-center px-4 py-10 md:px-10">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
