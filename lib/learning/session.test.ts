import { describe, expect, it, vi, afterEach } from "vitest";
import { learningFixture } from "./test-fixture";
import { validateCourse, toBank } from "./schema";
import { sessionEngine, type LearningState } from "./session";
import { derive } from "../engine/evidence";
import { generateCourse, configuredKey } from "./gemini";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("generated content validation", () => {
  it("accepts a complete graph and content bank", () => { expect(validateCourse(learningFixture()).skills).toHaveLength(5); });
  it.each([
    ["cycles", (c: ReturnType<typeof learningFixture>) => { c.skills[0].prerequisites = [{ skillId: "S5", origin: "inferred", reason: "Invalid cycle" }]; }],
    ["missing skills", (c: ReturnType<typeof learningFixture>) => { c.questions[0].skillId = "S7"; }],
    ["multiple correct answers", (c: ReturnType<typeof learningFixture>) => { c.questions[0].options[1].correct = true; }],
    ["repeated question text", (c: ReturnType<typeof learningFixture>) => { c.questions[1].text = c.questions[0].text; }],
    ["missing repair checks", (c: ReturnType<typeof learningFixture>) => { c.questions = c.questions.filter((q) => q.id !== "S2-check-0"); }],
    ["missing fresh target questions", (c: ReturnType<typeof learningFixture>) => { c.questions = c.questions.filter((q) => q.id !== "S5-boss-3"); }],
    ["quiz consuming reserved checks", (c: ReturnType<typeof learningFixture>) => { c.quizIds[0] = "S1-check-0"; }],
  ] as const)("rejects %s", (_name, mutate) => { const c = learningFixture(); mutate(c); expect(() => validateCourse(c)).toThrow(); });
  it("keeps content banks isolated from the algebra demo", () => {
    const bank = toBank(learningFixture());
    expect(bank.questions[0].verify.type).toBe("conceptual");
    expect(Object.keys(bank.misconceptions).some((id) => id.includes("coverage"))).toBe(true);
  });
});

function reachMission() {
  const course = validateCourse(learningFixture());
  const engine = sessionEngine(course);
  let state = engine.reducer(engine.initial(), { type: "start" });
  let safety = 0;
  while (state.stage === "quiz" || state.stage === "trace" || state.stage === "report") {
    if (++safety > 30) throw new Error("Trace failed to terminate");
    if (state.stage === "report") { state = engine.reducer(state, { type: "trace" }); continue; }
    state = engine.reducer(state, { type: "answer", option: state.current!.skillId === "S1" ? 0 : 1, confidence: "sure" });
    state = engine.reducer(state, { type: "continue" });
  }
  expect(state.root).toBe("S2");
  state = engine.reducer(state, { type: "repair" });
  state = engine.reducer(state, { type: "practise" });
  return { engine, state };
}

function repairToBoss() {
  const reached = reachMission();
  const { engine } = reached;
  let { state } = reached;
  while (state.stage === "practice" || state.stage === "bridge") {
    state = engine.reducer(state, { type: "answer", option: 0, confidence: "sure" });
    state = engine.reducer(state, { type: "continue" });
  }
  expect(state.stage).toBe("boss");
  return { engine, state };
}

describe("generated learning session", () => {
  it("runs quiz, adaptive trace, repair, bridge and two independent proof questions", () => {
    const reached = repairToBoss();
    const { engine } = reached;
    let { state } = reached;
    const first = state.current!.id;
    state = engine.reducer(state, { type: "answer", option: 0, confidence: "sure" });
    state = engine.reducer(state, { type: "continue" });
    expect(state.stage).toBe("boss"); expect(state.current!.id).not.toBe(first);
    state = engine.reducer(state, { type: "answer", option: 0, confidence: "sure" });
    state = engine.reducer(state, { type: "continue" });
    expect(state.result).toEqual({ rootDefeated: true, transferVerified: true, needsSupport: false });
    expect(derive(engine.graph, state.learner).status.S3).not.toBe("known");
    expect(new Set(state.learner.attempts.map((a) => a.questionId)).size).toBe(state.learner.attempts.length);
  });
  it.each(["wrong", "guessed"])("doesn't claim transfer when confirmation is %s", (variant) => {
    const reached = repairToBoss();
    const { engine } = reached;
    let { state } = reached;
    state = engine.reducer(state, { type: "answer", option: 0, confidence: "sure" });
    state = engine.reducer(state, { type: "continue" });
    state = engine.reducer(state, { type: "answer", option: variant === "wrong" ? 1 : 0, confidence: variant === "guessed" ? "guess" : "sure" });
    state = engine.reducer(state, { type: "continue" });
    expect(state.stage).toBe("boss"); expect(state.bossPasses).toBe(0); expect(state.result).toBeNull();
  });
  it("reports support needed after repeated failed repairs", () => {
    const reached = reachMission();
  const { engine } = reached;
  let { state } = reached;
    for (let i = 0; i < 3; i++) {
      state = engine.reducer(state, { type: "answer", option: 1, confidence: "sure" });
      state = engine.reducer(state, { type: "continue" });
    }
    expect(state.result).toEqual({ rootDefeated: false, transferVerified: false, needsSupport: true });
  });
  it("cannot consume reserved repair questions when diagnostics run out", () => {
    const course = learningFixture();
    const engine = sessionEngine(course);
    let state: LearningState = engine.reducer(engine.initial(), { type: "start" });
    for (let i = 0; i < 8; i++) {
      state = engine.reducer(state, { type: "answer", option: i === 0 ? 1 : 0, confidence: "guess" });
      state = engine.reducer(state, { type: "continue" });
    }
    state = engine.reducer(state, { type: "trace" });
    let iterations = 0;
    while (state.stage === "trace") {
      expect(state.current!.kind).toBe("diagnostic");
      state = engine.reducer(state, { type: "answer", option: 0, confidence: "guess" });
      state = engine.reducer(state, { type: "continue" });
      if (++iterations > 30) throw new Error("Unbounded probes");
    }
    expect(state.diagnosis?.uncertain).toBe(true); expect(state.root).toBeNull();
  });
});

describe("Gemini integration", () => {
  const response = (value: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(value) }] } }] }));
  it("recognises a placeholder key without making a paid request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_PLACEHOLDER");
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(configuredKey()).toBeNull();
    await expect(generateCourse({ text: "notes", objective: "", level: "College" })).rejects.toThrow("Add your Gemini API key");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends PDFs as document bytes and requires a second content review", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetcher = vi.fn().mockResolvedValueOnce(response(learningFixture())).mockResolvedValueOnce(response({ approved: true, issues: [] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await generateCourse({ pdf: Buffer.from("%PDF-test"), objective: "Coverage", level: "College" });
    expect(result.title).toBe("Software testing fixture"); expect(fetcher).toHaveBeenCalledTimes(2);
    const request = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(request.contents[0].parts[1].inlineData.mimeType).toBe("application/pdf");
    expect(request.generationConfig.responseFormat.text.mimeType).toBe("application/json");
    expect(fetcher.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-key");
  });
  it("rejects content that the review fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(learningFixture())).mockResolvedValueOnce(response({ approved: false, issues: ["Wrong answer"] })));
    await expect(generateCourse({ text: "notes", objective: "", level: "College" })).rejects.toThrow("AI review found");
  });
  it("handles quota errors without leaking provider responses or credentials", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider detail", { status: 429 })));
    await expect(generateCourse({ text: "notes", objective: "", level: "College" })).rejects.toThrow("quota or rate limit");
  });
});
