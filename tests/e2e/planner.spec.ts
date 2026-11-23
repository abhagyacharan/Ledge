import { expect, test } from "@playwright/test";

/**
 * Making a plan (docs/plans-module-spec.md §2b, §2c). The e2e server runs with VOICE_FAKE=1, so the
 * questions, the follow-up and the plan come from built-in rules, never from Groq. Goal, basics,
 * all four question kinds, a follow-up, then the review by keyboard (cut, keep, edit), Add plan
 * and Undo.
 */

test("make a plan: goal, basics, questions, follow-up, keyboard review, add, undo", async ({
  page,
}) => {
  await page.goto("/plans/new");

  // 1. Goal
  await page.getByLabel("Your goal, in your own words").fill("Learn e2e juggling in two weeks");
  await page.getByRole("button", { name: "Next" }).click();

  // 2. Basics
  await expect(page.getByRole("heading", { name: "Two quick basics" })).toBeVisible();
  await page.getByRole("radio", { name: "1 month" }).click();
  await page.getByRole("radio", { name: "30 min" }).click();
  await expect(page.getByText(/in all,/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // 3. Questions: one choice (moves on by itself), several, scale, text
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.getByRole("radio", { name: /Landing pages/ }).click();
  await expect(page.getByText("Question 2 of 4")).toBeVisible();
  await page.getByRole("checkbox", { name: /Built a site/ }).click();
  await expect(page.getByText("1 picked")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 3 of 4")).toBeVisible();
  await page.getByRole("radio", { name: "4", exact: true }).click();
  await expect(page.getByText("4 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 4 of 4")).toBeVisible();
  await page.getByLabel("Anything you have already tried, or want to avoid?").fill("Cold calls");
  await page.getByRole("button", { name: "Next" }).click();

  // 3b. Follow-up
  await expect(page.getByText("Follow-up 1 of 1")).toBeVisible();
  await page.getByRole("radio", { name: /Never/ }).click();

  // 5/6. Review. Cards view, keyboard only.
  await expect(page.getByText("Review your plan")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("radio", { name: "Cards" }).click();
  await expect(page.getByText(/Card 1 of 9/)).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).focus();
  await page.keyboard.press("e");
  const title = page.getByLabel("Task title");
  await expect(title).toBeVisible();
  await title.fill("Write down my juggling goal");
  await title.press("Enter");
  await expect(page.getByRole("heading", { name: "Write down my juggling goal" })).toBeVisible();

  // Keep the first card, cut the second, keep the rest.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Card 2 of 9 · 0 cut/)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText(/Card 3 of 9 · 1 cut/)).toBeVisible();
  for (let i = 3; i <= 9; i++) {
    await page.keyboard.press("ArrowRight");
    if (i < 9) await expect(page.getByText(new RegExp(`Card ${i + 1} of 9`))).toBeVisible();
  }
  await expect(page.getByText("Summary · 9 cards")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("8 tasks");

  // Add plan, then land on the plan's page.
  await page.getByRole("button", { name: "Add plan" }).click();
  await expect(page).toHaveURL(/\/plans\/[0-9a-f-]{36}$/);
  const toast = page.locator("[data-sonner-toast]", { hasText: "Added 8 tasks to" });
  await expect(toast).toBeVisible();
  await expect(page.getByText("Learn e2e juggling in").first()).toBeVisible();

  // Undo returns to the review.
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page).toHaveURL(/\/plans\/[0-9a-f-]{36}\/setup$/);
  await expect(page.getByText("Review your plan")).toBeVisible();
});
