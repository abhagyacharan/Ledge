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
      "/tasks",
      "/today",
      "/upcoming",
      "/all",
      "/completed",
      "/trash",
      "/settings",
      "/search",
      "/search?q=call",
      "/expenses",
      "/expenses/income",
      "/expenses/emis",
      "/expenses/spending",
      "/expenses/investments",
    ]) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await audit(page, `${path} (${scheme})`);
      });
    }

    test("a list and its View panel", async ({ page }) => {
      await page.goto("/tasks");
      await page.getByRole("link", { name: "Work", exact: true }).click();
      await expect(page.getByRole("heading", { level: 2, name: "Work" })).toBeVisible();
      await audit(page, `the Work list (${scheme})`);

      await page.getByRole("button", { name: /^View/ }).click();
      await expect(page.getByLabel("Sort by")).toBeVisible();
      await audit(page, `the View panel (${scheme})`);
    });

    test("the log-a-transaction menu and the period picker", async ({ page }) => {
      await page.goto("/expenses");
      await page.getByRole("button", { name: "Log a transaction" }).click();
      await expect(page.getByRole("menu")).toBeVisible();
      await page.waitForTimeout(300); // the menu pops in; let it settle
      await audit(page, `log a transaction menu (${scheme})`);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: /^Choose period/ }).click();
      await expect(page.getByRole("dialog", { name: "Choose a period" })).toBeVisible();
      await page.waitForTimeout(300);
      await audit(page, `period picker (${scheme})`);
    });

    test("the add-entry dialogs on the expense tabs", async ({ page }) => {
      for (const [path, button] of [
        ["/expenses/income", "Add income"],
        ["/expenses/emis", "Add EMI or loan payment"],
        ["/expenses/spending", "Add expense"],
        ["/expenses/investments", "Add investment"],
      ]) {
        await page.goto(path);
        await page.getByRole("button", { name: button, exact: true }).first().click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.waitForTimeout(400); // the dialog zooms in; let it settle
        await audit(page, `${button} dialog (${scheme})`);
      }
    });

    test("the new list form", async ({ page }) => {
      await page.goto("/tasks");
      await page.getByRole("button", { name: "New list" }).first().click();
      await expect(page.getByRole("dialog", { name: "New list" })).toBeVisible();
      await page.getByRole("button", { name: "Reading", exact: true }).click();
      await page.getByRole("radio", { name: "Teal" }).click();
      await page.waitForTimeout(400); // the dialog zooms in; let it settle
      await audit(page, `new list form (${scheme})`);
    });

    test("quick add with understood chips", async ({ page }) => {
      await page.goto("/tasks");
      await page.keyboard.press("q");
      await page.getByLabel("Task", { exact: true }).fill("Pay rent tomorrow 5pm #home p1");
      await expect(page.getByRole("list", { name: "Understood from your text" })).toBeVisible();
      await page.waitForTimeout(400); // the dialog zooms in; let it settle
      await audit(page, `quick add with chips (${scheme})`);
    });

    test("the task drawer", async ({ page }) => {
      await page.goto("/today");
      await page.getByRole("link", { name: /^Call mom/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await audit(page, `the task drawer (${scheme})`);
    });

    test("the task drawer of a repeating task", async ({ page }) => {
      await page.goto("/today");
      await page.getByRole("link", { name: /^Send monthly invoice/ }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Repeat every")).toBeVisible();
      await audit(page, `the drawer of a repeating task (${scheme})`);

      // A weekly one also shows the weekday buttons.
      await page.goto("/upcoming");
      await page.getByRole("link", { name: /^Triage new issues/ }).click();
      await expect(
        page.getByRole("dialog").getByRole("group", { name: "Repeat on" }),
      ).toBeVisible();
      await audit(page, `the drawer of a weekly task (${scheme})`);
    });

    test("the command palette and the shortcuts list", async ({ page }) => {
      await page.goto("/tasks");
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
