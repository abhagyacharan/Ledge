import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Appearance & time"
      groups={[
        { label: "Theme", rows: 1, tall: true },
        { label: "Time", rows: 2 },
      ]}
    />
  );
}
