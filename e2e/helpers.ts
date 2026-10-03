import { expect, type Page } from "@playwright/test";

/** Wait until the demo says it's ready (all code and fonts loaded). */
export async function openReadyDemo(page: Page) {
  await page.goto("/demo");
  const start = page.getByRole("button", { name: "Start demo" });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  return start;
}

/**
 * One step of the scripted run, using the same controls a presenter would:
 * continue after feedback, else pick the Script option and scripted confidence,
 * else press the stage's main action. Returns what it did.
 */
export async function step(page: Page): Promise<string> {
  const main = page.locator("main");
  const cont = main.locator("[role=status] button");
  if (await cont.count()) {
    await cont.first().click();
    return "continue";
  }
  const scripted = main.locator("label", { hasText: "Script" });
  if (await scripted.count()) {
    await scripted.first().click();
    await main.locator("button:has([aria-label='(scripted choice)'])").click();
    return "answer";
  }
  for (const name of ["Start demo", "TRACE MY GAP", "Start my Root Gap Mission", "I've got it"]) {
    const b = main.getByRole("button", { name, exact: false });
    if ((await b.count()) && (await b.first().isEnabled())) {
      await b.first().click();
      return name;
    }
  }
  return "idle";
}

/** Step until `done` returns true, waiting out short animations when idle. */
export async function stepUntil(page: Page, done: () => Promise<boolean>, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await done()) return;
    const r = await step(page);
    if (r === "idle") await page.waitForTimeout(400);
  }
  throw new Error("stepUntil: condition not reached");
}

export const atStage = (page: Page, text: string | RegExp) => async () =>
  (await page.locator("main").getByText(text).count()) > 0;

export async function noHorizontalOverflow(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, "page must not scroll horizontally").toBeLessThanOrEqual(cw);
}
