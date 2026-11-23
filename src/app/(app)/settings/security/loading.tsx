import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Sign-in & security"
      groups={[
        { label: "Sign-in methods", rows: 2, tall: true },
        { label: "Devices", rows: 2 },
      ]}
    />
  );
}
