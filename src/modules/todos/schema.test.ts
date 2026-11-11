import { describe, expect, it } from "vitest";
import { createListSchema, createTaskSchema, moveSchema, updateTaskSchema } from "./schema";

const uuid = "3f2b8c1e-5d4a-4b7e-9c1d-0a1b2c3d4e5f";

describe("task schemas", () => {
  it("trims the title and requires 1 to 500 characters", () => {
    expect(createTaskSchema.parse({ listId: uuid, title: "  Hi  " }).title).toBe("Hi");
    expect(createTaskSchema.safeParse({ listId: uuid, title: "   " }).success).toBe(false);
    expect(createTaskSchema.safeParse({ listId: uuid, title: "x".repeat(500) }).success).toBe(true);
    expect(createTaskSchema.safeParse({ listId: uuid, title: "x".repeat(501) }).success).toBe(
      false,
    );
  });

  it("rejects ids that are not UUIDs", () => {
    expect(createTaskSchema.safeParse({ listId: "1", title: "Hi" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ id: "../etc", title: "Hi" }).success).toBe(false);
  });

  it("accepts only real dates and times, and normalises the time", () => {
    const base = { listId: uuid, title: "Hi" };
    expect(createTaskSchema.safeParse({ ...base, dueDate: "2026-02-30" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...base, dueDate: "tomorrow" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...base, dueTime: "25:00" }).success).toBe(false);
    const ok = createTaskSchema.parse({ ...base, dueDate: "2026-11-10", dueTime: "09:30:00" });
    expect(ok).toMatchObject({ dueDate: "2026-11-10", dueTime: "09:30" });
    expect(createTaskSchema.parse({ ...base, dueDate: null, dueTime: null }).dueDate).toBeNull();
  });

  it("limits priority to whole numbers from 0 to 3", () => {
    const base = { listId: uuid, title: "Hi" };
    for (const priority of [0, 1, 2, 3]) {
      expect(createTaskSchema.safeParse({ ...base, priority }).success).toBe(true);
    }
    for (const priority of [-1, 4, 1.5, "2"]) {
      expect(createTaskSchema.safeParse({ ...base, priority }).success).toBe(false);
    }
  });

  it("turns empty notes into null and trims them", () => {
    expect(updateTaskSchema.parse({ id: uuid, notes: "   " }).notes).toBeNull();
    expect(updateTaskSchema.parse({ id: uuid, notes: " hello " }).notes).toBe("hello");
  });

  it("leaves unsent fields undefined so they are not overwritten", () => {
    const parsed = updateTaskSchema.parse({ id: uuid, title: "Only title" });
    expect(parsed.notes).toBeUndefined();
    expect(parsed.priority).toBeUndefined();
    expect(parsed.dueDate).toBeUndefined();
  });
});

describe("list schemas", () => {
  it("accepts hex colours and null, and rejects other colour strings", () => {
    expect(createListSchema.safeParse({ name: "A", color: "#3b82f6" }).success).toBe(true);
    expect(createListSchema.safeParse({ name: "A", color: null }).success).toBe(true);
    expect(createListSchema.safeParse({ name: "A", color: "blue" }).success).toBe(false);
    expect(createListSchema.safeParse({ name: "A", color: "#fff" }).success).toBe(false);
  });

  it("limits list names", () => {
    expect(createListSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createListSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("validates a goal target date", () => {
    expect(createListSchema.safeParse({ name: "A", targetDate: "2026-12-31" }).success).toBe(true);
    expect(createListSchema.safeParse({ name: "A", targetDate: "31/12/2026" }).success).toBe(false);
  });

  it("only allows up or down when moving", () => {
    expect(moveSchema.safeParse({ id: uuid, direction: "up" }).success).toBe(true);
    expect(moveSchema.safeParse({ id: uuid, direction: "left" }).success).toBe(false);
  });
});
