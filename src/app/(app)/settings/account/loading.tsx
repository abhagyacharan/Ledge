import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Account"
      groups={[
        { label: null, rows: 1, tall: true },
        { label: null, rows: 2 },
      ]}
    />
  );
}
