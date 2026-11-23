import { getSignInMethods } from "@/server/data/sign-in-methods";
import { requireUser } from "@/server/session";
import { AccountSection } from "./components/account-section";

/** Settings › Account's content, shared by /settings (with a mouse) and /settings/account. */
export async function AccountContent() {
  const { userId, user } = await requireUser();
  const methods = await getSignInMethods(userId);
  return (
    <AccountSection
      name={user.name}
      email={user.email}
      image={user.image}
      google={methods.google}
    />
  );
}
