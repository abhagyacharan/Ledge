import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return <SectionSkeleton title="Delete account" groups={[{ label: null, rows: 3 }]} />;
}
