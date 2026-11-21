import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { SitePage } from "@/modules/site/components/site-page";
import "@/modules/site/site.css";

// The site's one extra face: a serif italic for one word per headline (docs/site designs/design-system.md).
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
});

export const metadata: Metadata = {
  title: { absolute: "Ledge, the everyday ledger" },
  description:
    "Tasks, money and a daily journal in one calm, private place. Add anything by typing or by voice.",
};

/**
 * The public page about Ledge. Signed-out visitors to / see it (src/proxy.ts rewrites / here);
 * signed-in people get Home at / as before.
 */
export default function WelcomePage() {
  return (
    <div className={`${instrumentSerif.variable} flex flex-1 flex-col`}>
      <SitePage />
    </div>
  );
}
