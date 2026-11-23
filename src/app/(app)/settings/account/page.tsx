import type { Metadata } from "next";
import { AccountContent } from "@/modules/account/account-content";

export const metadata: Metadata = { title: "Account" };

/** Settings › Account (screens 9b to 9d). */
export default function AccountPage() {
  return <AccountContent />;
}
