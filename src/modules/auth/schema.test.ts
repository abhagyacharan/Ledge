import { describe, expect, it } from "vitest";
import { fieldErrors, newPasswordSchema, signInSchema, signUpSchema } from "./schema";

describe("signUpSchema", () => {
  const valid = { name: "Abhi", email: "A@Example.com ", password: "0123456789" };

  it("accepts a valid input and normalises the email", () => {
    const parsed = signUpSchema.parse(valid);
    expect(parsed.email).toBe("a@example.com");
  });

  it("requires at least 10 characters", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "123456789" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).password).toMatch(/10/);
  });

  it("rejects an invalid email and an empty name", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "nope", name: " " });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBeDefined();
      expect(errors.name).toBeDefined();
    }
  });
});

describe("signInSchema", () => {
  it("does not enforce password length (so old passwords never get a hint)", () => {
    expect(signInSchema.safeParse({ email: "a@example.com", password: "x" }).success).toBe(true);
  });

  it("requires both fields", () => {
    expect(signInSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("accepts two matching passwords of 10 or more characters", () => {
    expect(
      newPasswordSchema.safeParse({ password: "a-long-pass", confirm: "a-long-pass" }).success,
    ).toBe(true);
  });

  it("puts a mismatch on the confirm field", () => {
    const parsed = newPasswordSchema.safeParse({ password: "a-long-pass", confirm: "a-long-pas" });
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(fieldErrors(parsed.error).confirm).toBe("The two passwords don't match");
  });

  it("refuses a short password", () => {
    const parsed = newPasswordSchema.safeParse({ password: "short", confirm: "short" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(fieldErrors(parsed.error).password).toMatch(/at least 10/);
  });
});
