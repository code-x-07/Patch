import { describe, expect, it } from "vitest";
import { derive, graph } from "../engine";
import { initialState, reducer } from "./course";
import type { DemoState } from "./flow";
import { DEMO_STUDENT, scriptedAnswer } from "./script";

/** Drive the UI reducer exactly as a presenter following the script would. */
function runScripted(fast: boolean) {
  let s: DemoState = reducer(initialState(fast), { type: "start" });
  const stages: string[] = [s.stage];
  let guard = 0;
  while (s.stage !== "victory" && guard++ < 200) {
    if (s.current && !s.feedback) {
      const c = scriptedAnswer(DEMO_STUDENT, s.current.question, s.current.phase);
      s = reducer(s, { type: "answer", optionIndex: c.optionIndex, confidence: c.confidence });
    } else if (s.feedback) {
      s = reducer(s, { type: "continue" });
    } else if (s.stage === "report") {
      s = reducer(s, { type: "trace" });
    } else if (s.stage === "reveal") {
      s = reducer(s, { type: "beginMission" });
    } else if (s.stage === "mission") {
      s = reducer(s, { type: "lessonDone" });
    } else {
      throw new Error(`stuck at ${s.stage}`);
    }
    if (stages[stages.length - 1] !== s.stage) stages.push(s.stage);
  }
  return { s, stages };
}

describe("demo flow (UI state machine)", () => {
  it("runs quiz → report → trace → reveal → mission → boss → victory with the scripted student", () => {
    const { s, stages } = runScripted(false);
    expect(stages).toEqual(["quiz", "report", "trace", "reveal", "mission", "boss", "victory"]);
    expect(s.diagnosis?.rootGaps).toEqual(["S3"]);
    expect(s.mission?.plan.path).toEqual(["S3", "S8", "S9", "S10", "S13", "S17"]);
    expect(s.result).toEqual({ rootDefeated: true, transferVerified: true, needsTeacher: false });
  });

  it("records where the trace came from for each probe", () => {
    const { s } = runScripted(false);
    const s13 = s.probes.find((p) => p.skill === "S13");
    expect(s13?.from).toBe("S17");
    const s3 = s.probes.find((p) => p.skill === "S3");
    expect(s3?.from).toBe("S8");
  });

  it("fast mode skips bridges but still verifies transfer", () => {
    const { s } = runScripted(true);
    expect(s.mission?.plan.bridges).toEqual([]);
    expect(s.result?.transferVerified).toBe(true);
  });

  it("reset restores the deterministic initial state", () => {
    const { s } = runScripted(false);
    const r = reducer(s, { type: "reset" });
    expect(r).toEqual(initialState(false));
  });

  it("disputing reopens the root and asks a new distinct question", () => {
    let s: DemoState = reducer(initialState(), { type: "start" });
    while (s.stage !== "reveal") {
      if (s.current && !s.feedback) {
        const c = scriptedAnswer(DEMO_STUDENT, s.current.question, s.current.phase);
        s = reducer(s, { type: "answer", optionIndex: c.optionIndex, confidence: c.confidence });
      } else if (s.feedback) s = reducer(s, { type: "continue" });
      else s = reducer(s, { type: "trace" });
    }
    const seen = new Set(s.learner.attempts.map((a) => a.questionId));
    s = reducer(s, { type: "dispute" });
    expect(s.stage).toBe("trace");
    expect(s.current?.question.skillId).toBe("S3");
    expect(seen.has(s.current!.question.id)).toBe(false);
    expect(derive(graph, s.learner).status.S3).toBe("suspect");
  });
});
