import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { getPushConfig } from "@/server/env";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";

// Body text: quiet and neutral, so the content leads.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Page titles and the big numbers: a grotesque with some character, used sparingly.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

// Money, dates and column heads: the cash-book voice.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Paint edge to edge on phones so env(safe-area-inset-*) is real; the shell pads its content and
// the floating tab bar away from the notch and the home bar.
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  // iPhone "Add to Home Screen": open full screen under the right name (docs/pwa-spec.md).
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${bricolage.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <ServiceWorkerRegister pushConfigured={getPushConfig() !== null} />
      </body>
    </html>
  );
}
