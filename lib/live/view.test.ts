import { describe, expect, it } from "vitest";
import { initialState, reducer, type DemoState } from "../demo/flow";
import { DEMO_STUDENT, scriptedAnswer } from "../demo/script";
import { toLiveView } from "./view";

function* run(): Generator<DemoState> {
  let s = reducer(initialState(), { type: "start" });
  for (let i = 0; i < 200 && s.stage !== "victory"; i++) {
    yield s;
    if (s.current && !s.feedback) {
      const c = scriptedAnswer(DEMO_STUDENT, s.current.question, s.current.phase);
      s = reducer(s, { type: "answer", optionIndex: c.optionIndex, confidence: c.confidence });
    } else if (s.feedback) s = reducer(s, { type: "continue" });
    else if (s.stage === "report") s = reducer(s, { type: "trace" });
    else if (s.stage === "reveal") s = reducer(s, { type: "beginMission" });
    else s = reducer(s, { type: "lessonDone" });
  }
  yield s;
}

describe("live view projection", () => {
  it("never includes answer flags or misconception tags for an unanswered question", () => {
    let checked = 0;
    for (const s of run()) {
      const v = toLiveView(s);
      if (v.current && !v.feedback) {
        checked++;
        for (const o of v.current.question.options) {
          expect(Object.keys(o)).toEqual(["text"]);
        }
        const json = JSON.stringify(v.current);
        expect(json).not.toMatch(/misconception|"correct"|verify|expr/);
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("reveals the answer key for a question only after it was answered", () => {
    for (const s of run()) {
      const v = toLiveView(s);
      if (v.current && v.feedback) {
        expect(v.current.question.options.filter((o) => o.correct === true)).toHaveLength(1);
        return;
      }
    }
    throw new Error("no answered state seen");
  });

  it("never exposes upcoming mission or Boss Fight questions", () => {
    for (const s of run()) {
      const json = JSON.stringify(toLiveView(s));
      for (const q of s.mission?.plan.practice ?? []) {
        if (!s.learner.attempts.some((a) => a.questionId === q.id) && s.current?.question.id !== q.id) {
          expect(json).not.toContain(`"${q.id}"`);
        }
      }
      expect(json).not.toMatch(/S17-boss[34]/);
    }
  });

  it("carries the Fight Report, reveal evidence and result", () => {
    const states = [...run()];
    const last = toLiveView(states.at(-1)!);
    expect(last.report?.total).toBe(8);
    expect(last.reveal?.chain).toEqual(["S17", "S13", "S10", "S9", "S8", "S3"]);
    expect(last.result).toEqual({ rootDefeated: true, transferVerified: true, needsTeacher: false });
  });
});
