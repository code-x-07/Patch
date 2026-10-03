import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { learningFixture } from "../lib/learning/test-fixture";

// Gemini is mocked with a synthetic deep course; no live provider result is claimed.
const FAILING = ["Selecting test suites", "Coverage comparisons", "Decision coverage", "Decision outcomes", "Statement coverage"];

async function check(page: Page, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name}: no horizontal scroll`).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${name}: ${v.id}`)).toEqual([]);
}

/** Answer as a student weak in the upper chain: wrong on failing skills until the repair, right otherwise. */
async function step(page: Page, repaired: () => boolean) {
  const main = page.locator("main");
  const cont = main.locator("[role=status] button");
  if (await cont.count()) return cont.first().click();
  if (await main.locator("legend").count()) {
    const text = await main.locator("legend span").nth(1).innerText();
    const fail = !repaired() && FAILING.some((n) => text.startsWith(n));
    await main.locator("label").nth(0).waitFor();
    const labels = main.locator("label");
    // Fixture: the correct answer is "The proportion of selected items exercised".
    const n = await labels.count();
    for (let i = 0; i < n; i++) {
      const isCorrect = (await labels.nth(i).innerText()).includes("proportion of selected items");
      if (isCorrect !== fail) { await labels.nth(i).click(); break; }
    }
    return page.getByRole("button", { name: "I'm sure" }).click();
  }
  for (const name of ["TRACE MY GAP", "Start my Root Gap Mission", "I've got it"]) {
    const b = main.getByRole("button", { name });
    if ((await b.count()) && (await b.isEnabled())) return b.click();
  }
  await page.waitForTimeout(300);
}

for (const vp of [{ width: 375, height: 812, tag: "mobile" }, { width: 1440, height: 900, tag: "laptop" }]) {
  test(`learn (${vp.tag}): generated deep map, Fight Report, trace, mission, Boss Fight on the shared screens`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(vp);
    await page.route("**/api/learning/generate", (route) => route.fulfill({ json: { course: learningFixture(), sourceName: "Fixture" } }));
    await page.goto("/learn");
    await check(page, "upload");
    await page.getByRole("button", { name: "Use the Software Testing Week 8 text example" }).click();
    await page.getByRole("button", { name: "Generate my learning path" }).click();

    // Preview: the whole deep map, drawn with the same Knowledge Map as the demo.
    await expect(page.getByRole("heading", { name: "Software testing fixture" })).toBeVisible();
    await expect(page.locator("main")).toContainText("8");
    await check(page, "preview");
    await page.screenshot({ path: `artifacts/screenshots/learn-${vp.tag}-preview.png` });
    await page.getByRole("button", { name: "Start my quiz" }).click();

    let repaired = false;
    for (let i = 0; i < 200 && !(await page.getByText("Your Fight Report").count()); i++) await step(page, () => repaired);
    await expect(page.getByRole("button", { name: "TRACE MY GAP" })).toBeVisible();
    await check(page, "fight report");
    await page.screenshot({ path: `artifacts/screenshots/learn-${vp.tag}-report.png` });

    for (let i = 0; i < 200 && !(await page.getByText("Root gap confirmed").count()); i++) await step(page, () => repaired);
    await expect(page.locator("main")).toContainText("statement coverage");
    await check(page, "reveal");
    await page.screenshot({ path: `artifacts/screenshots/learn-${vp.tag}-reveal.png` });

    repaired = true;
    for (let i = 0; i < 200 && !(await page.getByText("Open my Knowledge Map").count()); i++) await step(page, () => repaired);
    await expect(page.getByText("ROOT GAP DEFEATED")).toBeVisible();
    await expect(page.getByText("TRANSFER VERIFIED")).toBeVisible();
    await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
    await expect(page.getByRole("heading", { name: "Your Knowledge Map" })).toBeVisible();
    await check(page, "map");
  });
}

test("generation errors are shown and recoverable", async ({ page }) => {
  await page.goto("/learn");
  await page.route("**/api/learning/generate", (route) => route.fulfill({ status: 503, json: { error: "AI sessions aren't set up on this server yet (missing GEMINI_API_KEY)." } }));
  await page.getByLabel("Lecture notes or slides").setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test") });
  await page.getByRole("button", { name: "Generate my learning path" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("GEMINI_API_KEY");
  await expect(page.getByRole("button", { name: "Generate my learning path" })).toBeEnabled();
});
