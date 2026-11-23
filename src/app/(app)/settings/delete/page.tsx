import type { Metadata } from "next";
import { DeleteSection } from "@/modules/account/components/delete-section";
import { SectionHeader } from "@/modules/account/components/ui";
import { signedInJustNow } from "@/modules/account/settings-data";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import { getSession, requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Delete account" };

/** Settings › Delete account (screen 9n). */
export default async function DeletePage({ searchParams }: PageProps<"/settings/delete">) {
  const { userId, user } = await requireUser();
  const [methods, session, { confirmed }] = await Promise.all([
    getSignInMethods(userId),
    getSession(),
    searchParams,
  ]);
  const fresh = session !== null && signedInJustNow(session.session.createdAt);
  return (
    <>
      <SectionHeader title="Delete account" />
      <DeleteSection
        hasPassword={methods.password}
        email={user.email}
        confirmed={!methods.password && confirmed === "1" && fresh}
      />
    </>
  );
}
