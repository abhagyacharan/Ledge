import { SectionSkeleton } from "@/modules/account/components/section-skeleton";

export default function Loading() {
  return (
    <SectionSkeleton
      title="Notifications"
      groups={[
        { label: null, rows: 1, tall: true },
        { label: "Devices with reminders", rows: 1 },
        { label: "Default reminder", rows: 1, tall: true },
        { label: "Quiet hours", rows: 1, tall: true },
      ]}
    />
  );
}
