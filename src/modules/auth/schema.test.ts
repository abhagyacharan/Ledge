import { describe, expect, it } from "vitest";
import { fieldErrors, signInSchema, signUpSchema } from "./schema";

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
