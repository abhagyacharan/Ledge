import { describe, expect, it } from "vitest";
import { resetPasswordEmail } from "./reset-email";

describe("resetPasswordEmail", () => {
  const url = "https://ledge.example.com/api/auth/reset-password/abc?callbackURL=%2Freset-password";

  it("greets by first name and carries the link in both parts", () => {
    const email = resetPasswordEmail({ name: "Asha Rao", url });
    expect(email.subject).toBe("Reset your Ledge password");
    expect(email.text).toContain("Hi Asha,");
    expect(email.text).toContain(url);
    expect(email.html).toContain(url.replaceAll("&", "&amp;"));
  });

  it("falls back to 'there' for an empty name", () => {
    expect(resetPasswordEmail({ name: "  ", url }).text).toContain("Hi there,");
  });

  it("escapes a name that looks like HTML", () => {
    const { html } = resetPasswordEmail({ name: "<b>x</b>", url });
    expect(html).not.toContain("<b>x");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
