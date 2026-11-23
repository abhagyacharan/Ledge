import type { Metadata } from "next";
import { AppearanceSection } from "@/modules/account/components/appearance-section";
import { getUserSettings } from "@/server/data/settings";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Appearance & time" };

/** Settings › Appearance & time (screen 9j). */
export default async function AppearancePage() {
  const { userId } = await requireUser();
  const settings = await getUserSettings(userId);
  const currencyName =
    new Intl.DisplayNames(["en"], { type: "currency" }).of(settings.currency) ?? settings.currency;
  const localeName =
    new Intl.DisplayNames(["en"], { type: "language" }).of(settings.locale) ?? settings.locale;
  const sample = new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 0,
  }).format(123456);
  return (
    <AppearanceSection
      timezone={settings.timezone}
      weekStartsOn={settings.weekStartsOn}
      currency={{ name: currencyName, code: settings.currency }}
      locale={{ name: localeName, code: settings.locale, sample }}
    />
  );
}
