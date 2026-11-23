import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Journal lock"
      groups={[
        { label: null, rows: 2 },
        { label: "Lock again", rows: 4 },
      ]}
    />
  );
}
