import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { learningFixture } from "../lib/learning/test-fixture";

async function check(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.description}`)).toEqual([]);
}

test("individual session: generated preview through trace, mission, transfer and map on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/learning/generate", (route) => route.fulfill({ json: { course: learningFixture(), sourceName: "Test fixture notes" } }));
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Build a learning session" })).toBeVisible();
  await check(page);
  await page.screenshot({ path: "artifacts/screenshots/learning-mobile-upload.png", fullPage: true });
  await page.getByRole("button", { name: "Use the Software Testing Week 8 text example" }).click();
  await page.getByRole("button", { name: "Generate my learning path" }).click();
  await expect(page.getByRole("button", { name: "Start my quiz" })).toBeDisabled();
  await check(page);
  await page.getByRole("button", { name: "Statement coverage: Not tested" }).click();
  await expect(page.getByRole("region", { name: "Selected skill details" })).toContainText("AI-proposed link");
  await page.screenshot({ path: "artifacts/screenshots/learning-mobile-preview.png", fullPage: true });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my quiz" }).click();
  async function answer(correct: boolean) {
    await page.getByRole("radio").nth(correct ? 0 : 1).locator("..").click();
    await page.getByRole("button", { name: "I'm sure", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await check(page);
  for (let i = 0; i < 8; i++) await answer(i === 0 || i === 5);
  await expect(page.getByRole("heading", { name: "2 of 8 correct" })).toBeVisible();
  await check(page);
  await page.getByRole("button", { name: "TRACE MY GAP" }).click();
  await check(page);
  await page.screenshot({ path: "artifacts/screenshots/learning-mobile-trace.png", fullPage: true });
  for (let i = 0; i < 2; i++) await answer(false);
  await expect(page.getByRole("heading", { name: "Start with statement coverage." })).toBeVisible();
  await page.getByText("Why Patch thinks this · View evidence", { exact: true }).click();
  await check(page);
  await page.getByRole("button", { name: "Start my Root Gap Mission" }).click();
  await check(page);
  await page.getByRole("button", { name: "Let’s practise" }).click();
  for (let i = 0; i < 4; i++) await answer(true);
  await expect(page.getByRole("heading", { name: "Prove · Boss Fight" })).toBeVisible();
  await check(page);
  for (let i = 0; i < 2; i++) await answer(true);
  await expect(page.getByRole("heading", { name: "TRANSFER VERIFIED", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ROOT GAP DEFEATED", exact: true })).toBeVisible();
  await check(page);
  await page.screenshot({ path: "artifacts/screenshots/learning-mobile-result.png", fullPage: true });
  await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
  await check(page);
  await page.getByRole("button", { name: "Restart this session" }).click();
  await expect(page.getByRole("button", { name: "Start my quiz" })).toBeDisabled();
});

test("PDF upload and generation errors are recoverable", async ({ page }) => {
  await page.goto("/learn");
  await page.route("**/api/learning/generate", async (route) => {
    expect(route.request().postDataBuffer()?.toString()).toContain("%PDF-test");
    await route.fulfill({ status: 503, json: { error: "Add your Gemini API key to GEMINI_API_KEY in .env, then restart the local server." } });
  });
  await page.getByLabel("Lecture notes or slides").setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-test") });
  await page.getByRole("button", { name: "Generate my learning path" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("GEMINI_API_KEY");
  await expect(page.getByRole("button", { name: "Generate my learning path" })).toBeEnabled();
});

test("desktop preview and keyboard-only answer work", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/learning/generate", (route) => route.fulfill({ json: { course: learningFixture(), sourceName: "Test fixture notes" } }));
  await page.goto("/learn");
  await page.getByRole("button", { name: "Use the Software Testing Week 8 text example" }).click();
  await page.getByRole("button", { name: "Generate my learning path" }).click();
  await expect(page.getByRole("heading", { name: "Software testing fixture" })).toBeVisible();
  await check(page);
  await page.screenshot({ path: "artifacts/screenshots/learning-laptop-preview.png", fullPage: true });
  await page.getByRole("checkbox").focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Start my quiz" }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("radio").first().focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "I'm sure", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Fight · Question 2 of 8" })).toBeVisible();
});

test("real generation route rejects cross-origin and unconfigured/empty requests", async ({ request }) => {
  const foreign = await request.post("/api/learning/generate", { headers: { origin: "https://foreign.invalid" }, multipart: { notes: "too short" } });
  expect(foreign.status()).toBe(403);
  const empty = await request.post("/api/learning/generate", { multipart: { notes: "too short" } });
  // Even if a developer has added a real key, this invalid request cannot
  // trigger a provider call. Placeholder keys return a clear setup message.
  expect([400, 503]).toContain(empty.status());
  expect((await empty.json()).error).toBeTruthy();
});

test("landing keeps both learning and the original demo reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Study your notes" }).first()).toHaveAttribute("href", "/learn");
  await expect(page.getByRole("link", { name: "Try the demo" }).first()).toHaveAttribute("href", "/demo");
  await check(page);
});
