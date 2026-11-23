import { SettingsNav } from "@/modules/account/components/settings-nav";
import { APP_VERSION } from "@/server/version";

/**
 * Settings (docs/settings-design-prompt.md, screens 9a to 9p): one section at a time. With a mouse
 * the settings column sits beside the content; on a phone the settings home lists the sections
 * and each opens as its own screen, with no tab bar (O, 2026-11-23).
 */
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="dash flex gap-10 lg:gap-14">
      <SettingsNav version={APP_VERSION} />
      <div className="mx-auto flex w-full max-w-[640px] min-w-0 flex-col gap-3">{children}</div>
    </div>
  );
}
