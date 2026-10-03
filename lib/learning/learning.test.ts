import { afterEach, describe, expect, it, vi } from "vitest";
import type { SkillId } from "../content/types";
import { autoLayout } from "../course";
import { makeFlow, type DemoState } from "../demo/flow";
import { derive } from "../engine/evidence";
import { toCourseDef } from "./course";
import { generateCourse } from "./gemini";
import { chainLength, generationSchema, mapSchema, MIN_CHAIN, validateCourse, validateMap, type Course } from "./schema";
import { learningFixture } from "./test-fixture";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generated course structure", () => {
  it("accepts a deep, complete course", () => {
    const c = validateCourse(learningFixture());
    expect(c.skills).toHaveLength(8);
    expect(chainLength(c)).toBeGreaterThanOrEqual(MIN_CHAIN);
  });

  it("rejects a shallow map", () => {
    const c = learningFixture();
    // Make every skill a direct prerequisite of the target: depth 2.
    const shallow = { ...c, skills: c.skills.map((s) => ({ ...s, prerequisites: s.id === "S8" ? c.skills.filter((x) => x.id !== "S8").map((x) => ({ skillId: x.id, reason: "r", origin: "notes" as const })).slice(0, 3) : [] })) };
    expect(() => validateMap(shallow)).toThrow();
  });

  it("chooses an 8-question quiz nearest the target, one diagnostic per skill", () => {
    const c = learningFixture();
    expect(new Set(c.quizIds).size).toBe(8);
    const skills = c.quizIds.map((id) => c.questions.find((q) => q.id === id)!.skillId);
    expect(skills[0]).toBe("S8");
    expect(new Set(skills).size).toBe(8);
  });

  it("sends Gemini a schema without local-only bounds", () => {
    const json = JSON.stringify(generationSchema({ type: "object", properties: { a: { type: "string", maxLength: 5 } } }));
    expect(json).not.toContain("maxLength");
  });

  it("lays out any graph top-down with no overlapping nodes", () => {
    const course = toCourseDef(learningFixture());
    const { layout } = autoLayout(course.graph, course.target);
    const ys = Object.values(layout).map((p) => p.y);
    expect(layout[course.target].y).toBe(Math.min(...ys));
    for (const s of course.skills) for (const p of s.prereqs) expect(layout[p].y).toBeGreaterThan(layout[s.id].y);
    const pts = Object.values(layout);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(40);
    }
  });
});

describe("generated course on the shared engine", () => {
  const course = toCourseDef(learningFixture());
  const flow = makeFlow(course);
  const FAILS: SkillId[] = ["S8", "S7", "S6", "S5", "S4"];

  /** Correct option is first in the fixture; a wrong one is second. */
  function run(repairs = true) {
    let s: DemoState = flow.reducer(flow.initialState(), { type: "start" });
    for (let i = 0; i < 300 && s.stage !== "victory"; i++) {
      if (s.current && !s.feedback) {
        const repairing = s.current.phase === "mission" || s.current.phase === "boss";
        const fail = FAILS.includes(s.current.question.skillId) && !(repairing && repairs);
        s = flow.reducer(s, { type: "answer", optionIndex: fail || (repairing && !repairs) ? 1 : 0, confidence: "sure" });
      } else if (s.feedback) s = flow.reducer(s, { type: "continue" });
      else if (s.stage === "report") s = flow.reducer(s, { type: "trace" });
      else if (s.stage === "reveal") s = flow.reducer(s, { type: "beginMission" });
      else s = flow.reducer(s, { type: "lessonDone" });
    }
    return s;
  }

  it("traces to the deepest failed skill and repairs it", () => {
    const s = run();
    expect(s.diagnosis?.rootGaps).toEqual(["S4"]);
    expect(s.mission?.plan.path).toEqual(["S4", "S5", "S6", "S7", "S8"]);
    expect(s.result).toEqual({ rootDefeated: true, transferVerified: true, needsTeacher: false });
  });

  it("uses only this course's questions, and probes only diagnostics", () => {
    const s = run();
    const ids = new Set(course.bank.questions.map((q) => q.id));
    for (const a of s.learner.attempts) expect(ids.has(a.questionId)).toBe(true);
    for (const a of s.learner.attempts.filter((x) => x.phase === "probe")) {
      expect(course.bank.questions.find((q) => q.id === a.questionId)!.kind).toBe("diagnostic");
    }
  });

  it("does not claim success when the repair fails", () => {
    const s = run(false);
    expect(s.result?.transferVerified).toBe(false);
    expect(s.result?.needsTeacher).toBe(true);
    expect(derive(course.graph, s.learner).status.S4).not.toBe("known");
  });
});

describe("Gemini pipeline (mocked)", () => {
  const reply = (value: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] }));
  const fixture = learningFixture();
  const map = mapSchema.parse(fixture);
  const notes = { text: "notes ".repeat(30), objective: "", level: "College" };

  /** Route each mocked call by what the prompt asks for. */
  function gemini(review: (n: number) => { approved: boolean; issues: { skillId: string; problem: string }[] }, mapDraft: (n: number) => unknown = () => map) {
    let maps = 0, reviews = 0;
    return vi.fn(async (_url: string, init: { body: string; headers: Record<string, string> }) => {
      const prompt: string = JSON.parse(init.body).contents[0].parts[0].text;
      if (prompt.startsWith("Build the skill map")) return reply(mapDraft(maps++));
      if (prompt.startsWith("Write questions")) return reply({ questions: fixture.questions });
      return reply(review(reviews++));
    });
  }

  it("does not call Gemini without a real key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_PLACEHOLDER");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(generateCourse(notes)).rejects.toThrow("GEMINI_API_KEY");
    expect(f).not.toHaveBeenCalled();
  });

  it("builds map, questions in parallel chunks, and a review; sends PDFs as bytes", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = gemini(() => ({ approved: true, issues: [] }));
    vi.stubGlobal("fetch", f);
    const course: Course = await generateCourse({ pdf: Buffer.from("%PDF-test"), objective: "Coverage", level: "College" });
    expect(course.skills).toHaveLength(8);
    expect(course.quizIds).toHaveLength(8);
    expect(f).toHaveBeenCalledTimes(1 + 2 + 1); // map + 2 question calls + review
    const body = JSON.parse(f.mock.calls[0][1].body);
    expect(body.contents[0].parts[1].inlineData.mimeType).toBe("application/pdf");
    expect(f.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-key");
  });

  it("retries a too-shallow map once with the exact problem", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const shallow = { ...map, skills: map.skills.map((s) => ({ ...s, prerequisites: [] })) };
    const f = gemini(() => ({ approved: true, issues: [] }), (n) => (n === 0 ? shallow : map));
    vi.stubGlobal("fetch", f);
    await expect(generateCourse(notes)).resolves.toHaveProperty("title");
    const second = JSON.parse(f.mock.calls[1][1].body).contents[0].parts[0].text;
    expect(second).toContain("Fix these problems");
  });

  it("repairs flagged skills once, then requires approval", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const f = gemini((n) => (n === 0 ? { approved: false, issues: [{ skillId: "S2", problem: "Ambiguous answer" }] } : { approved: true, issues: [] }));
    vi.stubGlobal("fetch", f);
    await expect(generateCourse(notes)).resolves.toHaveProperty("title");
    // map + 2 chunks + review + 1 repaired chunk + review
    expect(f).toHaveBeenCalledTimes(6);
  });

  it("refuses content the review keeps rejecting", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", gemini(() => ({ approved: false, issues: [{ skillId: "S2", problem: "Wrong answer key" }] })));
    await expect(generateCourse(notes)).rejects.toThrow("AI review");
  });

  it("falls back to the next model when one is out of quota", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "model-a");
    const base = gemini(() => ({ approved: true, issues: [] }));
    const f = vi.fn(async (url: string, init: { body: string; headers: Record<string, string> }) =>
      url.includes("model-a") ? new Response("quota", { status: 429 }) : base(url, init));
    vi.stubGlobal("fetch", f);
    await expect(generateCourse(notes)).resolves.toHaveProperty("title");
    expect(f.mock.calls.some(([u]) => String(u).includes("gemini-3.5-flash"))).toBe(true);
  });

  it("reports quota errors without leaking provider detail", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider detail", { status: 429 })));
    const err = (await generateCourse(notes).catch((e: Error) => e)) as Error;
    expect(err.message).toContain("quota or rate limit");
    expect((err as Error).message).not.toContain("sensitive");
  });
});
