import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { AUTH_FILE } from "./constants";

/**
 * Captures the real app for the public page's mockups (src/modules/site). Not part of the normal
 * run: it only does anything with SITE_SHOTS=1.
 *
 *   SITE_SHOTS=1 pnpm exec playwright test tests/e2e/site-shots.spec.ts --project=desktop
 *
 * It signs in as the seeded demo user (fresh e2e database), writes a journal page for today, and
 * saves phone screens (390 wide, 3x) and one laptop screen (1440 x 900, 2x) to public/site/, plus
 * where the phone tab bar's buttons are, so the page can make them clickable.
 */
test.skip(!process.env.SITE_SHOTS, "Set SITE_SHOTS=1 to capture screenshots for the public page");
test.use({ storageState: AUTH_FILE });

const OUT = "public/site";
/** The phone mockup's screen below its status bar: 320 x 594 CSS px, drawn from a 390-wide page. */
const PHONE = { width: 390, height: 724 };

async function tidy(page: Page) {
  // Hide the Next.js dev badge and stop the caret blinking, so the shots are clean and stable.
  await page.addStyleTag({
    content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}",
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
}

test("capture the app for the public page", async ({ browser }) => {
  test.setTimeout(420_000);
  mkdirSync(OUT, { recursive: true });

  const phone = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: PHONE,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await phone.newPage();

  // A journal page for today, so the Journal screen has a mood and words.
  await page.goto("/journal");
  await page.waitForLoadState("networkidle");
  const good = page.getByRole("radio", { name: "Good" });
  await expect(async () => {
    await good.tap();
    await expect(good).toHaveAttribute("aria-checked", "true", { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await page
    .getByRole("textbox", { name: "Today's page" })
    .fill(
      "Paid the rent and called mom. Long walk after work, then cooked dal at home instead of ordering in. The pitch for the new client goes out tomorrow.",
    );
  await expect(page.getByText(/^Saved /)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("textbox", { name: "Today's page" }).blur();

  const screens = [
    { name: "home", path: "/" },
    { name: "tasks", path: "/today" },
    { name: "expenses", path: "/expenses" },
    { name: "journal", path: "/journal" },
  ];
  let tabs: { label: string; x: number; y: number; width: number; height: number }[] = [];
  for (const screen of screens) {
    await page.goto(screen.path);
    await tidy(page);
    await page.screenshot({ path: `${OUT}/phone-${screen.name}.png` });
    if (screen.name === "home") {
      tabs = await page.evaluate(() => {
        // The phone tab bar's links: the ones in the bottom strip of the screen.
        const links = Array.from(document.querySelectorAll<HTMLElement>("nav a")).filter((a) => {
          const r = a.getBoundingClientRect();
          return r.top > window.innerHeight - 140 && r.width > 0;
        });
        return links.map((a) => {
          const r = a.getBoundingClientRect();
          return {
            label: (a.textContent ?? "").trim(),
            x: r.left,
            y: r.top,
            width: r.width,
            height: r.height,
          };
        });
      });
    }
  }
  writeFileSync(`${OUT}/phone-tabs.json`, JSON.stringify({ viewport: PHONE, tabs }, null, 2));
  await phone.close();

  // The laptop: the Work list with a task open beside it.
  const laptop = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const desk = await laptop.newPage();
  await desk.goto("/tasks");
  await desk.getByRole("link", { name: /^Work/ }).first().click();
  await desk.waitForURL(/\/lists\//);
  await desk.getByText("Write project proposal").first().click();
  await desk.waitForURL(/task=/);
  await tidy(desk);
  await desk.screenshot({ path: `${OUT}/laptop-list.png` });
  await laptop.close();
});
