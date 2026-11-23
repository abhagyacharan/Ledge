import type { Metadata } from "next";
import { AiUsageCard, type UsageMonth } from "@/modules/account/ai-usage-card";
import { SectionHeader } from "@/modules/account/components/ui";
import { RupeeRate, VoiceSettings } from "@/modules/account/components/voice-section";
import { groupFeatures, rupeesText } from "@/modules/planner/plan-view";
import { getAiUsageSummary, type MonthUsage } from "@/server/data/ai-usage";
import { getUserSettings } from "@/server/data/settings";
import { getVoiceConfig } from "@/server/env";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Voice & AI" };

/** Settings › Voice & AI (screen 9k): voice capture, then what Voice and Plans used (8m). */
export default async function VoicePage() {
  const { userId } = await requireUser();
  const [settings, usage] = await Promise.all([getUserSettings(userId), getAiUsageSummary(userId)]);
  const usageMonth = (m: MonthUsage): UsageMonth => {
    const [y, mo] = m.month.split("-").map(Number);
    return {
      label: new Intl.DateTimeFormat(settings.locale, { month: "long", timeZone: "UTC" }).format(
        new Date(Date.UTC(y, mo - 1, 15)),
      ),
      total: {
        requests: m.requests,
        tokens: m.inputTokens + m.outputTokens,
        costMicros: m.costMicros,
      },
      grouped: groupFeatures(m.features),
    };
  };
  return (
    <>
      <SectionHeader title="Voice & AI" />
      <VoiceSettings
        voice={
          getVoiceConfig().enabled
            ? {
                enabled: settings.voiceEnabled,
                languages: settings.voiceLanguages,
                titleLanguage: settings.voiceTitleLanguage,
              }
            : null
        }
      />
      <div className="mt-3">
        <AiUsageCard
          thisMonth={usageMonth(usage.thisMonth)}
          lastMonth={usageMonth(usage.lastMonth)}
          usdToInr={settings.usdToInr}
          rupeeRate={rupeesText(settings.usdToInr)}
        />
      </div>
      <RupeeRate usdToInr={settings.usdToInr} />
    </>
  );
}
