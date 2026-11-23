import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Tasks"
      groups={[
        { label: "Archived lists", rows: 2 },
        { label: null, rows: 1 },
      ]}
    />
  );
}
