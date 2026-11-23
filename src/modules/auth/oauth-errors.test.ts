import { describe, expect, it } from "vitest";
import { googleErrorMessage } from "./oauth-errors";

describe("googleErrorMessage", () => {
  it("is silent without a code", () => {
    expect(googleErrorMessage(undefined)).toBeNull();
    expect(googleErrorMessage("")).toBeNull();
  });

  it("explains closed sign-ups and an unlinked account", () => {
    expect(googleErrorMessage("signup_disabled")).toMatch(/Sign-ups are closed/);
    expect(googleErrorMessage("account_not_linked")).toMatch(/Forgot password\?/);
  });

  it("never echoes an unknown code", () => {
    expect(googleErrorMessage("<script>")).toBe("Google sign-in didn't work. Try again.");
  });
});
