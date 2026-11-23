import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Voice & AI"
      groups={[
        { label: null, rows: 1, tall: true },
        { label: "AI usage", rows: 2 },
      ]}
    />
  );
}
