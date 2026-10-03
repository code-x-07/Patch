import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { atStage, openReadyDemo, stepUntil } from "./helpers";

const report: Record<string, { id: string; impact: string | null | undefined; nodes: number; help: string }[]> = {};

async function scan(page: Page, name: string) {
  // Let entrance animations finish so colours are final.
  await page.waitForTimeout(900);
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  report[name] = res.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  const bad = res.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(bad.map((v) => `${name}: ${v.id} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")})`)).toEqual([]);
}

test.afterAll(() => {
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync("artifacts/axe-report.json", JSON.stringify(report, null, 2));
});

test("axe: landing and join", async ({ page }) => {
  await page.goto("/");
  await scan(page, "landing");
  await page.goto("/join");
  await scan(page, "join");
});

test("axe: every demo stage and Present mode", async ({ page }) => {
  await openReadyDemo(page);
  await scan(page, "demo-intro");
  await page.getByRole("button", { name: "Start demo" }).click();
  await scan(page, "quiz");
  await stepUntil(page, atStage(page, "Your Fight Report"));
  await scan(page, "fight-report");
  await page.getByRole("button", { name: "TRACE MY GAP" }).click();
  await page.waitForTimeout(1800);
  await scan(page, "trace");
  await stepUntil(page, atStage(page, "Root gap confirmed"));
  await page.getByRole("button", { name: "Why Patch thinks this" }).click();
  await scan(page, "reveal");
  await page.getByRole("button", { name: "Start my Root Gap Mission" }).click();
  await scan(page, "mission-lesson");
  await stepUntil(page, atStage(page, "BOSS FIGHT"));
  await scan(page, "boss");
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  await page.waitForTimeout(2500);
  await scan(page, "victory");
  await page.getByRole("button", { name: "Open my Knowledge Map" }).click();
  await scan(page, "knowledge-map");
  await page.getByRole("button", { name: "See the teacher view" }).click();
  await scan(page, "teacher");
  await page.getByRole("button", { name: "Present mode" }).click();
  await scan(page, "present-mode");
});
