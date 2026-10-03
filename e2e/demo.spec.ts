import { expect, test } from "@playwright/test";
import { atStage, noHorizontalOverflow, openReadyDemo, step, stepUntil } from "./helpers";

test("the whole demo loop runs offline after it's ready, with no network requests", async ({ page, context }) => {
  let ready = false;
  const after: string[] = [];
  page.on("request", (r) => { if (ready) after.push(`${r.method()} ${r.url()}`); });

  await openReadyDemo(page);
  ready = true;
  await context.setOffline(true);

  await stepUntil(page, atStage(page, "Your Fight Report"));
  await expect(page.getByRole("button", { name: "TRACE MY GAP" })).toBeVisible();
  await stepUntil(page, atStage(page, "Root gap confirmed"));
  await expect(page.locator("main")).toContainText("multiplying and dividing integers (including negatives)");

  // The evidence panel distinguishes direct from inferred knowledge.
  await page.getByRole("button", { name: "Why Patch thinks this" }).click();
  await expect(page.locator("#why-panel")).toContainText("Inferred from");
  await expect(page.locator("#why-panel")).toContainText("2 different questions right, sure, no hints");

  await stepUntil(page, atStage(page, "BOSS FIGHT"));
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  await expect(page.getByText("ROOT GAP DEFEATED")).toBeVisible();
  await expect(page.getByText("TRANSFER VERIFIED")).toBeVisible();

  await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
  await expect(page.getByRole("heading", { name: "Your Knowledge Map" })).toBeVisible();
  await page.getByRole("button", { name: "See the teacher view" }).click();
  await expect(page.getByText("Recommended teacher action")).toBeVisible();
  await expect(page.locator("main")).toContainText("of 12 students");
  await page.getByRole("button", { name: "Present mode" }).click();
  await expect(page.getByRole("dialog", { name: "Present mode" })).toBeVisible();
  await page.getByRole("button", { name: "Exit Present mode" }).click();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("button", { name: "Start demo" })).toBeEnabled();

  expect(after, "no requests after the demo is ready").toEqual([]);
});

test("375px: landing and every student stage fit without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await noHorizontalOverflow(page);
  await page.goto("/join");
  await noHorizontalOverflow(page);
  await openReadyDemo(page);
  await noHorizontalOverflow(page);
  for (let i = 0; i < 120; i++) {
    const r = await step(page);
    await noHorizontalOverflow(page);
    if (await page.getByText("Open my Knowledge Map").count()) break;
    if (r === "idle") await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
  await noHorizontalOverflow(page);
  await page.getByRole("button", { name: "See the teacher view" }).click();
  await noHorizontalOverflow(page);
});

test("reduced motion: the demo completes and decorative motion is off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openReadyDemo(page);
  await stepUntil(page, atStage(page, "Root gap confirmed"));
  // The pulsing ring is decorative and hidden; the root gap is still marked by icon + label.
  const decor = await page.locator(".motion-decor").evaluateAll((els) => els.map((e) => getComputedStyle(e).display));
  expect(decor.every((d) => d === "none")).toBe(true);
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  // All reward beats are shown immediately.
  await expect(page.getByText("ROOT GAP DEFEATED")).toBeVisible();
  await expect(page.getByText("TRANSFER VERIFIED")).toBeVisible();
});
