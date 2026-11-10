import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automatic accessibility audit (CLAUDE.md §8, §15): WCAG 2.1 A and AA rules, including colour
 * contrast, on every main screen in both the light and the dark theme. Axe cannot judge everything
 * (focus order and screen-reader wording still need a human), but it catches the mechanical faults.
 */

const SCHEMES = ["light", "dark"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function audit(page: Page, label: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes
        .slice(0, 3)
        .map((n) => `    ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1] ?? ""}`)
        .join("\n"),
  );
  expect(report, `Accessibility problems on ${label}:\n${report.join("\n")}`).toEqual([]);
}

for (const scheme of SCHEMES) {
  test.describe(`signed in, ${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    for (const path of [
      "/inbox",
      "/today",
      "/upcoming",
      "/all",
      "/completed",
      "/trash",
      "/settings",
    ]) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await audit(page, `${path} (${scheme})`);
      });
    }

    test("a list with sections and the View panel", async ({ page }) => {
      await page.goto("/inbox");
      await page.getByRole("link", { name: "Work", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Work" })).toBeVisible();
      await audit(page, `the Work list (${scheme})`);

      await page.getByRole("button", { name: /^View/ }).click();
      await expect(page.getByLabel("Sort by")).toBeVisible();
      await audit(page, `the View panel (${scheme})`);
    });

    test("the task drawer", async ({ page }) => {
      await page.goto("/today");
      await page.getByRole("link", { name: /^Call mom/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await audit(page, `the task drawer (${scheme})`);
    });

    test("the command palette and the shortcuts list", async ({ page }) => {
      await page.goto("/inbox");
      await page.keyboard.press("Control+k");
      await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
      await audit(page, `the command palette (${scheme})`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.keyboard.press("?");
      await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
      await audit(page, `the shortcuts list (${scheme})`);
    });
  });

  test.describe(`signed out, ${scheme} theme`, () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const path of ["/sign-in", "/sign-up"]) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await audit(page, `${path} (${scheme})`);
      });
    }
  });
}
