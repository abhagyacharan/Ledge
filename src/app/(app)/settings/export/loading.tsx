import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Reports & export"
      groups={[
        { label: "Money reports", rows: 2 },
        { label: "Your data", rows: 2 },
      ]}
    />
  );
}
