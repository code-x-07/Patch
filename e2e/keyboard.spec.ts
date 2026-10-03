import { expect, test } from "@playwright/test";
import { atStage, openReadyDemo, stepUntil } from "./helpers";

test("keyboard only: answer a question, reach the map, inspect a node, use Present mode", async ({ page }) => {
  const start = await openReadyDemo(page);
  await start.focus();
  await page.keyboard.press("Enter");

  // Answer with the keyboard: arrow through the radio group, Tab to "I'm sure", Enter.
  const first = page.locator("main input[type=radio]").first();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("main input[type=radio]:checked")).toHaveCount(1);
  await page.getByRole("button", { name: "I'm sure" }).focus();
  await page.keyboard.press("Enter");
  // Focus moves to Continue so Enter advances.
  await expect(page.locator("main [role=status] button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Question 2 of 8")).toBeVisible();

  // Fast-forward the rest, then use the map with the keyboard.
  await stepUntil(page, atStage(page, "Open my Knowledge Map"));
  await page.getByRole("button", { name: "Open my Knowledge Map" }).focus();
  await page.keyboard.press("Enter");
  const node = page.getByRole("button", { name: /^Fractions basics:/ });
  await node.focus();
  await expect(node).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inspect-h")).toHaveText("Fractions basics");
  await expect(node).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "See the teacher view" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Present mode" }).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Present mode" });
  await expect(dialog).toBeVisible();
  // Focus stays inside the modal.
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
