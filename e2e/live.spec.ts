import { expect, test, type Page } from "@playwright/test";
import { questions } from "../lib/content/questions";
import { DEMO_STUDENT, scriptedAnswer } from "../lib/demo/script";
import type { Phase } from "../lib/engine/types";

// Live Mode needs Supabase keys on the server under test. Skips cleanly without them.
test.beforeEach(async ({ request }) => {
  const r = await request.post("/api/classes", { data: { name: "" } });
  test.skip(r.status() === 503, "Live Mode isn't configured on this server (no Supabase keys).");
});

const byText = new Map(questions.map((q) => [q.text, q]));

/** Answer the current live question the way the scripted student would, using only what's on screen. */
async function answerLive(page: Page) {
  const legend = page.locator("main legend span").nth(1);
  const text = (await legend.innerText()).replace(/−/g, "-").replace(/²/g, "^2").trim();
  const q = byText.get(text) ?? [...byText.values()].find((x) => x.text.replace(/\s+/g, " ") === text);
  if (!q) throw new Error(`unknown question on screen: ${text}`);
  const stage = await page.evaluate(() => document.querySelector("main")?.textContent ?? "");
  const phase: Phase = /BOSS FIGHT/.test(stage) ? "boss" : /Practise:|Bridge:|bridge check/.test(stage) ? "mission" : /Question \d of 8/.test(stage) ? "quiz" : "probe";
  const c = scriptedAnswer(DEMO_STUDENT, q, phase);
  await page.locator("main label").nth(c.optionIndex).click();
  await page.getByRole("button", { name: c.confidence === "sure" ? "I'm sure" : "Guessing" }).click();
  await expect(page.locator("main [role=status] button")).toBeEnabled({ timeout: 15_000 });
}

/** Live answers round-trip to the server: wait for Continue to be ready, click once, wait for it to go. */
async function clickContinue(page: Page) {
  const btn = page.locator("main [role=status] button").first();
  await expect(btn).toBeEnabled({ timeout: 15_000 });
  await btn.click({ timeout: 15_000 });
  await btn.waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
}

async function stepLive(page: Page) {
  const main = page.locator("main");
  if (await main.locator("[role=status] button").count()) return clickContinue(page);
  if (await main.locator("legend").count()) return answerLive(page);
  for (const name of ["TRACE MY GAP", "Start my Root Gap Mission", "I've got it"]) {
    const b = main.getByRole("button", { name });
    if ((await b.count()) && (await b.isEnabled())) return b.click({ timeout: 15_000 });
  }
  await page.waitForTimeout(400);
}

test("live class: teacher creates, student joins and plays the full loop, teacher sees it, data is deleted", async ({ browser }) => {
  test.setTimeout(Number(process.env.LIVE_TIMEOUT ?? 420_000));
  const teacher = await (await browser.newContext()).newPage();
  const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();

  // Teacher creates a class.
  await teacher.goto("/teach");
  await teacher.getByLabel("Class name").fill("E2E test class");
  await teacher.getByRole("button", { name: "Create class" }).click();
  await expect(teacher).toHaveURL(/\/teach\/[0-9a-f-]{36}$/);
  const code = (await teacher.getByLabel(/^Class code/).innerText()).trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  // Watch every /api/play response: no answer key may appear before answering.
  const leaks: string[] = [];
  const timings: number[] = [];
  student.on("requestfinished", (req) => {
    if (req.url().includes("/api/play") && req.method() === "POST") timings.push(req.timing().responseEnd);
  });
  student.on("response", async (r) => {
    if (!r.url().includes("/api/play") || r.request().method() === "DELETE") return;
    const body = await r.json().catch(() => null);
    const v = body?.view;
    if (v?.current && !v.feedback && v.current.question.options.some((o: Record<string, unknown>) => "correct" in o)) {
      leaks.push(v.current.question.id);
    }
  });

  // Student joins and waits in the lobby.
  await student.goto("/join");
  await student.getByLabel("Class code").fill(code);
  await student.getByLabel("First name or nickname").fill("Robo");
  await student.getByRole("button", { name: "Join" }).click();
  await expect(student.getByText(/Waiting for E2E test class to start/)).toBeVisible();
  await expect(teacher.getByText(/1\s+student has joined/)).toBeVisible({ timeout: 10_000 });

  // The play page's JavaScript must not contain the question bank.
  const scripts = await student.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name).filter((n) => n.endsWith(".js")));
  for (const src of scripts) {
    const js = await (await student.request.get(src)).text();
    expect(js, `answer bank found in ${src}`).not.toContain("S17-boss3");
  }

  // Teacher starts; the student's first question appears without a reload.
  await teacher.getByRole("button", { name: "Start the quiz" }).click();
  await expect(student.getByText("Question 1 of 8")).toBeVisible({ timeout: 10_000 });

  for (let i = 0; i < 160; i++) {
    if (await student.getByText("Open my Knowledge Map").count()) break;
    await stepLive(student);
  }
  await expect(student.getByText("ROOT GAP DEFEATED")).toBeVisible();
  await expect(student.getByText("TRANSFER VERIFIED")).toBeVisible();
  expect(leaks).toEqual([]);
  timings.sort((a, b) => a - b);
  console.log(`answers sent: ${timings.length}, median API time ${Math.round(timings[timings.length >> 1])} ms`);

  // Teacher dashboard reflects the student's real result.
  await expect(teacher.getByText("Recommended teacher action")).toBeVisible({ timeout: 10_000 });
  await expect(teacher.locator("main")).toContainText("1 of 1 students");
  await expect(teacher.locator("main")).toContainText("Multiplying and dividing integers (including negatives)");

  // Delete my data, then the teacher deletes the class.
  await student.getByRole("button", { name: "Leave class" }).click();
  await student.getByRole("button", { name: "Delete my data" }).click();
  await expect(student).toHaveURL(/\/join/);
  await expect(teacher.getByText(/0\s+students have joined/)).toBeVisible({ timeout: 10_000 });
  await teacher.getByRole("button", { name: "Delete class data" }).click();
  await teacher.getByRole("button", { name: "Delete everything" }).click();
  await expect(teacher).toHaveURL(/\/teach$/);
});

test("live class from uploaded notes: teacher's course is what students play", async ({ browser }) => {
  test.setTimeout(Number(process.env.LIVE_TIMEOUT ?? 420_000));
  const { learningFixture } = await import("../lib/learning/test-fixture");
  const teacher = await (await browser.newContext()).newPage();
  const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();

  // Gemini mocked with a synthetic deep course; the real server still validates and stores it.
  await teacher.route("**/api/learning/generate", (route) => route.fulfill({ json: { course: learningFixture(), sourceName: "Fixture" } }));
  await teacher.goto("/teach");
  await teacher.getByLabel("Class name").fill("E2E notes class");
  await teacher.getByRole("radio", { name: "Paste notes" }).click();
  await teacher.getByLabel("Notes", { exact: true }).fill("Software testing notes. ".repeat(10));
  await teacher.getByRole("button", { name: "Create class" }).click();
  await expect(teacher).toHaveURL(/\/teach\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(teacher.getByText("Software testing fixture").first()).toBeVisible();
  const code = (await teacher.getByLabel(/^Class code/).innerText()).trim();

  await student.goto("/join");
  await student.getByLabel("Class code").fill(code);
  await student.getByLabel("First name or nickname").fill("Robo2");
  await student.getByRole("button", { name: "Join" }).click();
  await expect(student.getByText(/Waiting for E2E notes class/)).toBeVisible();
  await teacher.getByRole("button", { name: "Start the quiz" }).click();
  await expect(student.getByText("Question 1 of 8")).toBeVisible({ timeout: 10_000 });

  const FAIL = ["Selecting test suites", "Coverage comparisons", "Decision coverage", "Decision outcomes", "Statement coverage"];
  let repaired = false;
  for (let i = 0; i < 200; i++) {
    if (await student.getByText("Open my Knowledge Map").count()) break;
    if (await student.getByText("Root gap confirmed").count()) repaired = true;
    const main = student.locator("main");
    if (await main.locator("[role=status] button").count()) { await clickContinue(student); continue; }
    if (await main.locator("legend").count()) {
      const text = await main.locator("legend span").nth(1).innerText();
      const fail = !repaired && FAIL.some((n) => text.startsWith(n));
      const labels = main.locator("label");
      for (let j = 0; j < (await labels.count()); j++) {
        if ((await labels.nth(j).innerText()).includes("proportion of selected items") !== fail) { await labels.nth(j).click(); break; }
      }
      await student.getByRole("button", { name: "I'm sure" }).click();
      await expect(main.locator("[role=status] button")).toBeEnabled({ timeout: 15_000 });
      continue;
    }
    let clicked = false;
    for (const name of ["TRACE MY GAP", "Start my Root Gap Mission", "I've got it"]) {
      const b = main.getByRole("button", { name });
      if ((await b.count()) && (await b.isEnabled())) { await b.click({ timeout: 15_000 }); clicked = true; break; }
    }
    if (!clicked) await student.waitForTimeout(400);
  }
  await expect(student.getByText("ROOT GAP DEFEATED")).toBeVisible();
  await expect(teacher.locator("main")).toContainText("1 of 1 students", { timeout: 10_000 });

  await teacher.getByRole("button", { name: "Delete class data" }).click();
  await teacher.getByRole("button", { name: "Delete everything" }).click();
  await expect(teacher).toHaveURL(/\/teach$/);
});
