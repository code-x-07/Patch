import { describe, expect, it } from "vitest";
import { questionById, questionsForSkill } from "../content/questions";
import type { SkillId } from "../content/types";
import { DEMO_STUDENT } from "../demo/script";
import { simulate } from "../demo/simulate";
import {
  answer,
  buildGraph,
  createLearner,
  derive,
  dispute,
  graph,
  improvementScore,
  nextProbe,
  questionPoints,
  type Confidence,
  type Learner,
  type Phase,
} from ".";

const correctIndex = (qid: string) => questionById[qid].options.findIndex((o) => o.correct);
const wrongIndex = (qid: string) => questionById[qid].options.findIndex((o) => !o.correct);

function play(l: Learner, qid: string, correct: boolean, confidence: Confidence = "sure", phase: Phase = "probe", hints = 0) {
  return answer(l, questionById[qid], correct ? correctIndex(qid) : wrongIndex(qid), confidence, phase, hints).learner;
}

describe("direct evidence and inference", () => {
  it("two distinct Correct-and-Sure answers establish direct known", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", true);
    expect(derive(graph, l).direct.S3.status).toBe("unknown");
    l = play(l, "S3-c1", true);
    expect(derive(graph, l).direct.S3.status).toBe("known");
  });

  it("the same question twice does not count as two passes", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", true);
    l = play(l, "S3-d", true);
    expect(derive(graph, l).direct.S3.status).toBe("unknown");
  });

  it("Correct-and-Guess never establishes direct knowledge", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", true, "guess");
    l = play(l, "S3-c1", true, "guess");
    l = play(l, "S3-c2", true, "guess");
    expect(derive(graph, l).direct.S3.status).toBe("unknown");
  });

  it("a hinted correct answer does not count toward the direct pass rule", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", true, "sure", "probe", 1);
    l = play(l, "S3-c1", true);
    expect(derive(graph, l).direct.S3.status).toBe("unknown");
  });

  it("a strong pass marks eligible ancestors inferred_known, not known", () => {
    let l = createLearner(graph);
    l = play(l, "S8-d", true);
    l = play(l, "S8-c1", true);
    const d = derive(graph, l);
    expect(d.status.S8).toBe("known");
    for (const a of ["S3", "S2", "S4"] as SkillId[]) {
      expect(d.status[a]).toBe("inferred_known");
      expect(d.direct[a].status).toBe("unknown");
      expect(d.inferredFrom[a]).toContain("S8");
    }
  });

  it("an already directly known ancestor stays known (not downgraded to inferred)", () => {
    let l = createLearner(graph);
    l = play(l, "S2-d", true);
    l = play(l, "S2-c1", true);
    l = play(l, "S8-d", true);
    l = play(l, "S8-c1", true);
    const d = derive(graph, l);
    expect(d.status.S2).toBe("known");
    expect(d.inferredFrom.S2).toBeUndefined();
  });

  it("contradictory evidence overrides inference and reopens the branch", () => {
    let l = createLearner(graph);
    l = play(l, "S8-d", true);
    l = play(l, "S8-c1", true);
    expect(derive(graph, l).status.S3).toBe("inferred_known");
    l = play(l, "S3-d", false);
    let d = derive(graph, l);
    expect(d.status.S3).toBe("suspect");
    // A later pass higher up cannot overwrite the contradiction.
    l = play(l, "S9-d", true);
    l = play(l, "S9-c1", true);
    d = derive(graph, l);
    expect(d.status.S3).toBe("suspect");
    l = play(l, "S3-c1", false);
    expect(derive(graph, l).status.S3).not.toBe("inferred_known");
    expect(derive(graph, l).direct.S3.status).toBe("gap");
  });

  it("two distinct failures establish a gap; one only makes it suspect", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", false);
    expect(derive(graph, l).direct.S3.status).toBe("suspect");
    l = play(l, "S3-c1", false);
    expect(derive(graph, l).direct.S3.status).toBe("gap");
  });

  it("a root gap needs all direct prerequisites known or inferred", () => {
    let l = createLearner(graph);
    l = play(l, "S3-d", false);
    l = play(l, "S3-c1", false);
    expect(derive(graph, l).rootGaps).toEqual([]);
    l = play(l, "S2-d", true);
    l = play(l, "S2-c1", true);
    const d = derive(graph, l);
    expect(d.rootGaps).toEqual(["S3"]);
    expect(d.status.S3).toBe("root_gap");
    expect(d.status.S4).toBe("inferred_known");
  });

  it("disputing a diagnosis reopens the skill and the old attempts cannot reconfirm it", () => {
    let l = createLearner(graph);
    l = play(l, "S2-d", true);
    l = play(l, "S2-c1", true);
    l = play(l, "S3-d", false);
    l = play(l, "S3-c1", false);
    expect(derive(graph, l).rootGaps).toEqual(["S3"]);
    l = dispute(l, "S3");
    let d = derive(graph, l);
    expect(d.status.S3).toBe("suspect");
    expect(d.rootGaps).toEqual([]);
    const step = nextProbe(graph, l, "S3");
    expect(step.done).toBe(false);
    if (!step.done) {
      expect(step.skill).toBe("S3");
      expect(["S3-d", "S3-c1"]).not.toContain(step.question.id);
    }
    l = play(l, "S3-c2", false);
    expect(derive(graph, l).direct.S3.status).toBe("suspect");
    l = play(l, "S3-c3", false);
    d = derive(graph, l);
    expect(d.direct.S3.status).toBe("gap");
  });

  it("the cycle check rejects bad graphs", () => {
    expect(() =>
      buildGraph([
        { id: "S1", name: "a", short: "a", description: "", prereqs: ["S2"], lesson: {} as never },
        { id: "S2", name: "b", short: "b", description: "", prereqs: ["S1"], lesson: {} as never },
      ]),
    ).toThrow(/cycle/);
  });
});

describe("probe selection", () => {
  it("terminates with an uncertain diagnosis when a guessing student never confirms anything", () => {
    let l = createLearner(graph);
    l = play(l, "S17-d", false, "guess", "quiz");
    let guard = 0;
    let step = nextProbe(graph, l, "S17");
    while (!step.done && guard++ < 60) {
      const q = step.question;
      // Every answer is a correct guess: evidence, never confirmation.
      l = answer(l, q, correctIndex(q.id), "guess", "probe").learner;
      step = nextProbe(graph, l, "S17");
    }
    expect(step.done).toBe(true);
    if (step.done) {
      expect(step.rootGaps).toEqual([]);
      expect(step.uncertain).toBe(true);
    }
  });

  it("never asks the same question twice", () => {
    const r = simulate(DEMO_STUDENT);
    const ids = r.learner.attempts.map((a) => a.questionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("scripted demo student (section 10.3)", () => {
  const r = simulate(DEMO_STUDENT);
  const diagnosed = derive(graph, r.diagnosed);

  it("finds root gap S3 with no uncertainty", () => {
    expect(r.rootGaps).toEqual(["S3"]);
    expect(r.uncertain).toBe(false);
  });

  it("follows the failed branch with this exact deterministic probe order", () => {
    expect(r.probes.map((p) => `${p.questionId}:${p.correct ? "pass" : "fail"}`)).toEqual([
      "S17-c1:fail",
      "S13-c1:fail",
      "S16-c1:pass",
      "S10-c1:fail",
      "S9-c1:fail",
      "S8-d:fail",
      "S8-c1:fail",
      "S11-c1:pass",
      "S3-d:fail",
      "S3-c1:fail",
      "S2-d:pass",
      "S2-c1:pass",
    ]);
    // 8 quiz answers + 12 probes; confirmation never shortcut.
    expect(r.diagnosed.attempts).toHaveLength(20);
  });

  it("verifies S3 with two distinct failures and its foundation directly", () => {
    expect(diagnosed.direct.S3.failQs).toEqual(["S3-d", "S3-c1"]);
    expect(diagnosed.status.S2).toBe("known");
    expect(diagnosed.status.S4).toBe("inferred_known");
    expect(diagnosed.inferredFrom.S4).toContain("S2");
    expect(diagnosed.status.S16).toBe("known");
    expect(diagnosed.status.S11).toBe("known");
    for (const id of ["S14", "S15", "S7", "S1"] as SkillId[]) expect(diagnosed.status[id]).toBe("inferred_known");
    for (const id of ["S17", "S13", "S10", "S9", "S8"] as SkillId[]) expect(diagnosed.status[id]).toBe("gap");
  });

  it("repair path is S3 → S8 → S9 → S10 → S13 → S17", () => {
    expect(r.mission?.path).toEqual(["S3", "S8", "S9", "S10", "S13", "S17"]);
  });

  it("ends with ROOT GAP DEFEATED and TRANSFER VERIFIED", () => {
    expect(r.rootDefeated).toBe(true);
    expect(r.transferVerified).toBe(true);
    const final = derive(graph, r.learner);
    expect(final.status.S3).toBe("known");
    expect(final.status.S17).toBe("known");
  });

  it("a Boss Fight pass cannot erase unresolved intermediate evidence", () => {
    const final = derive(graph, r.learner);
    for (const id of ["S8", "S9", "S10", "S13"] as SkillId[]) {
      expect(["suspect", "gap"]).toContain(final.status[id]);
      expect(final.inferredFrom[id]).toBeUndefined();
    }
  });

  it("Demo Fast Mode skips bridges and leaves intermediates red", () => {
    const fast = simulate(DEMO_STUDENT, { fast: true });
    expect(fast.mission?.bridges).toEqual([]);
    expect(fast.transferVerified).toBe(true);
    const final = derive(graph, fast.learner);
    for (const id of ["S8", "S9", "S10", "S13"] as SkillId[]) expect(["gap", "root_gap"]).toContain(final.status[id]);
    // With S3 repaired, S8 becomes the next blocker in line.
    expect(final.rootGaps).toEqual(["S8"]);
  });

  it("boss variants are unseen and distinct from the failed target question", () => {
    const boss = r.learner.attempts.filter((a) => a.phase === "boss").map((a) => a.questionId);
    expect(boss).toEqual(["S17-boss1", "S17-boss2"]);
    expect(questionsForSkill("S17").filter((q) => q.kind === "boss").length).toBeGreaterThanOrEqual(2);
  });
});

describe("scoring (section 5)", () => {
  it("reproduces Maya = 56 and Leo = 11", () => {
    const maya = [0.3, 0.3, 0.35, 0.4, 0.4, 0.5, 0.6, 0.7].map((m) => questionPoints(true, m));
    const leo = [0.8, 0.85, 0.85, 0.9, 0.9, 0.95, 0.95, 0.95].map((m) => questionPoints(true, m));
    expect(improvementScore(maya)).toBe(56);
    expect(improvementScore(leo)).toBe(11);
  });

  it("floors a single question at -0.5", () => {
    expect(questionPoints(false, 0.9)).toBe(-0.5);
    expect(questionPoints(false, 0.3)).toBeCloseTo(-0.3);
    expect(questionPoints(true, 0.95, 3)).toBeCloseTo(-0.25);
    expect(questionPoints(false, 0.4, 2)).toBe(-0.5);
  });

  it("caps mastery change at 0.2 per quiz", () => {
    let l = createLearner(graph);
    const s3 = questionsForSkill("S3");
    for (const q of s3) l = answer(l, q, correctIndex(q.id), "sure", "quiz").learner;
    expect(l.mastery.S3).toBeCloseTo(0.7);
    let w = createLearner(graph);
    for (const q of s3) w = answer(w, q, wrongIndex(q.id), "sure", "quiz").learner;
    expect(w.mastery.S3).toBeCloseTo(0.3);
  });

  it("uses k = 0.15 / 0.07 / 0.20 by confidence", () => {
    const l = createLearner(graph);
    expect(answer(l, questionById["S3-d"], correctIndex("S3-d"), "sure", "quiz").learner.mastery.S3).toBeCloseTo(0.575);
    expect(answer(l, questionById["S3-d"], correctIndex("S3-d"), "guess", "quiz").learner.mastery.S3).toBeCloseTo(0.535);
    expect(answer(l, questionById["S3-d"], wrongIndex("S3-d"), "sure", "quiz").learner.mastery.S3).toBeCloseTo(0.4);
    expect(answer(l, questionById["S3-d"], wrongIndex("S3-d"), "guess", "quiz").learner.mastery.S3).toBeCloseTo(0.425);
  });
});
