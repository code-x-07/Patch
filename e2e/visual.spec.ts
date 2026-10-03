import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { atStage, openReadyDemo, stepUntil } from "./helpers";

const DIR = "artifacts/screenshots";
const cls: Record<string, { viewport: string; value: number; shifts: number }> = {};

/** Sum layout shifts not caused by recent input (the CLS definition), from page load. */
const CLS_SCRIPT = `
  window.__cls = { value: 0, shifts: 0 };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) { window.__cls.value += e.value; window.__cls.shifts++; }
    }
  }).observe({ type: "layout-shift", buffered: true });
`;
const readCls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: { value: number; shifts: number } }).__cls);

test.beforeAll(() => fs.mkdirSync(DIR, { recursive: true }));
test.afterAll(() => fs.writeFileSync("artifacts/cls.json", JSON.stringify(cls, null, 2)));

const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });

async function captureFlow(page: Page, prefix: string) {
  await shot(page, `${prefix}-demo-intro`);
  await page.getByRole("button", { name: "Start demo" }).click();
  await page.waitForTimeout(500);
  await shot(page, `${prefix}-quiz`);
  await stepUntil(page, atStage(page, "Your Fight Report"));
  await page.waitForTimeout(500);
  await shot(page, `${prefix}-fight-report`);
  await page.getByRole("button", { name: "TRACE MY GAP" }).click();
  await page.waitForTimeout(1900);
  await shot(page, `${prefix}-trace-start`);
  await stepUntil(page, async () => (await page.locator("main").getByText(/question 8 of/).count()) > 0);
  await page.waitForTimeout(700);
  await shot(page, `${prefix}-trace-mid`);
  await stepUntil(page, atStage(page, "Root gap confirmed"));
  await page.waitForTimeout(900);
  await shot(page, `${prefix}-reveal`);
  await page.getByRole("button", { name: "Start my Root Gap Mission" }).click();
  await page.waitForTimeout(500);
  await shot(page, `${prefix}-mission`);
  await stepUntil(page, atStage(page, "BOSS FIGHT"));
  await page.waitForTimeout(800);
  await shot(page, `${prefix}-boss`);
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  await page.waitForTimeout(2600);
  await shot(page, `${prefix}-victory`);
  await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
  await page.waitForTimeout(500);
  await shot(page, `${prefix}-knowledge-map`);
  await page.getByRole("button", { name: "See the teacher view" }).click();
  await page.waitForTimeout(600);
  await shot(page, `${prefix}-teacher`);
}

for (const vp of [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "laptop-1440", width: 1440, height: 900 },
]) {
  test(`screenshots and CLS at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.addInitScript(CLS_SCRIPT);

    await page.goto("/");
    await page.waitForTimeout(3000);
    await shot(page, `${vp.name}-landing`);
    const landing = await readCls(page);
    cls[`landing@${vp.name}`] = { viewport: `${vp.width}x${vp.height}`, ...landing };
    expect(landing.value).toBeLessThan(0.1);

    await page.goto("/join");
    await shot(page, `${vp.name}-join`);

    await openReadyDemo(page);
    await captureFlow(page, vp.name);
    const flow = await readCls(page);
    cls[`demo-flow@${vp.name}`] = { viewport: `${vp.width}x${vp.height}`, ...flow };
    expect(flow.value).toBeLessThan(0.1);
  });
}

test("Present mode at 1920x1080", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openReadyDemo(page);
  await page.getByRole("button", { name: "Start demo" }).click();
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  await page.getByRole("button", { name: "See the teacher view" }).click();
  await page.getByRole("button", { name: "Present mode" }).click();
  await page.waitForTimeout(600);
  await shot(page, "wide-1920-present-mode");
  await page.getByRole("dialog").evaluate((d) => d.scrollTo(0, 900));
  await page.waitForTimeout(300);
  await shot(page, "wide-1920-present-mode-lower");
});
