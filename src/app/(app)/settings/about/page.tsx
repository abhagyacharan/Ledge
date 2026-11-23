import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader, settingsCard } from "@/modules/account/components/ui";
import { APP_VERSION } from "@/server/version";

export const metadata: Metadata = { title: "About Ledge" };

/** Settings › About: the version, one line about Ledge, and the public page. */
export default function AboutPage() {
  return (
    <>
      <SectionHeader title="About" />
      <div className={`${settingsCard} flex flex-col gap-3 p-5`}>
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold">Ledge, the everyday ledger</span>
          <span className="font-mono text-[12px] font-medium text-dash-ink-soft">
            {APP_VERSION}
          </span>
        </p>
        <p className="text-[14px] leading-relaxed text-dash-ink-soft">
          One calm book for your tasks, money, journal and plans. Your data stays on this server.
        </p>
        <Link
          href="/welcome"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-[14px] font-semibold text-dash-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          See what Ledge does
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
