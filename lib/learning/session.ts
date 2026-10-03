import type { Question, SkillId } from "../content/types";
import { buildGraph } from "../engine/graph";
import { answer, createLearner, dispute, pickUnseen, type Feedback } from "../engine/learner";
import { nextProbe, type ProbeStep } from "../engine/diagnose";
import { nextBoss, planMission, type MissionPlan } from "../engine/mission";
import { derive } from "../engine/evidence";
import type { Confidence, Learner, Phase } from "../engine/types";
import { toBank, toSkills, type Course } from "./schema";

export type LearningStage = "preview" | "quiz" | "report" | "trace" | "reveal" | "lesson" | "practice" | "bridge" | "boss" | "result" | "map";
export type LearningState = {
  stage: LearningStage; learner: Learner; current: Question | null; feedback: Feedback | null;
  index: number; diagnosis: Extract<ProbeStep, { done: true }> | null;
  mission: MissionPlan | null; root: SkillId | null;
  bossPasses: number; bossFailures: number;
  result: { rootDefeated: boolean; transferVerified: boolean; needsSupport: boolean } | null;
};
export type LearningAction =
  | { type: "start" } | { type: "answer"; option: number; confidence: Confidence }
  | { type: "continue" } | { type: "trace" } | { type: "dispute" }
  | { type: "repair" } | { type: "practise" } | { type: "prove" }
  | { type: "map" } | { type: "result" } | { type: "restart" };

export function sessionEngine(course: Course) {
  const graph = buildGraph(toSkills(course));
  const bank = toBank(course);
  const quiz = course.quizIds.map((id) => bank.questions.find((q) => q.id === id)!);
  function initial(): LearningState {
    return { stage: "preview", learner: createLearner(graph), current: null, feedback: null, index: 0, diagnosis: null, mission: null, root: null, bossPasses: 0, bossFailures: 0, result: null };
  }
  const finish = (s: LearningState, transferVerified: boolean, needsSupport: boolean): LearningState => ({
    ...s, stage: "result", current: null, feedback: null,
    result: { rootDefeated: !!s.root && derive(graph, s.learner).direct[s.root].status === "known", transferVerified, needsSupport },
  });
  function probe(s: LearningState): LearningState {
    const step = nextProbe(graph, s.learner, course.targetSkillId, bank);
    if (!step.done) return { ...s, stage: "trace", current: step.question, feedback: null, diagnosis: null };
    return { ...s, stage: "reveal", current: null, feedback: null, diagnosis: step, root: step.uncertain ? null : step.rootGaps[0] ?? null };
  }
  function boss(s: LearningState): LearningState {
    const q = nextBoss(s.learner, course.targetSkillId, bank);
    return q ? { ...s, stage: "boss", current: q, feedback: null } : finish(s, false, true);
  }
  function bridge(s: LearningState, index: number): LearningState {
    const q = s.mission?.bridges[index];
    return q ? { ...s, stage: "bridge", index, current: q, feedback: null } : boss(s);
  }
  function reducer(s: LearningState, action: LearningAction): LearningState {
    switch (action.type) {
      case "restart": return initial();
      case "start": return { ...initial(), stage: "quiz", current: quiz[0] };
      case "map": return { ...s, stage: "map" };
      case "result": return { ...s, stage: s.result ? "result" : s.diagnosis ? "reveal" : "report" };
      case "trace": return s.stage === "report" ? probe(s) : s;
      case "dispute": return s.root && s.stage === "reveal" ? probe({ ...s, learner: dispute(s.learner, s.root), root: null }) : s;
      case "repair": {
        if (!s.root || s.stage !== "reveal") return s;
        const mission = planMission(graph, s.learner, s.root, course.targetSkillId, false, bank);
        return { ...s, stage: "lesson", mission, index: 0 };
      }
      case "practise": {
        if (!s.mission || s.stage !== "lesson") return s;
        const q = s.mission.practice[0];
        return q ? { ...s, stage: "practice", index: 0, current: q } : finish(s, false, true);
      }
      case "prove": return ["report", "reveal"].includes(s.stage) && !s.diagnosis?.uncertain ? boss(s) : s;
      case "answer": {
        if (!s.current || s.feedback || !["quiz", "trace", "practice", "bridge", "boss"].includes(s.stage)) return s;
        const phase: Phase = s.stage === "quiz" ? "quiz" : s.stage === "trace" ? "probe" : s.stage === "boss" ? "boss" : "mission";
        const result = answer(s.learner, s.current, action.option, action.confidence, phase, 0, bank);
        return { ...s, ...result };
      }
      case "continue": {
        if (!s.current || !s.feedback) return s;
        if (s.stage === "quiz") {
          const index = s.index + 1;
          return index < quiz.length ? { ...s, index, current: quiz[index], feedback: null } : { ...s, stage: "report", current: null, feedback: null, index: 0 };
        }
        if (s.stage === "trace") return probe(s);
        if (s.stage === "practice") {
          const index = s.index + 1;
          const q = s.mission?.practice[index];
          if (q) return { ...s, index, current: q, feedback: null };
          // A failed practice pair gets a fresh check; no completion claim is
          // made merely because the learner clicked through the lesson.
          if (s.root && derive(graph, s.learner).direct[s.root].status !== "known") {
            const extra = pickUnseen(s.learner, s.root, ["check"], undefined, bank);
            if (extra) return { ...s, index, current: extra, feedback: null };
            return finish(s, false, true);
          }
          return bridge(s, 0);
        }
        if (s.stage === "bridge") return bridge(s, s.index + 1);
        if (s.stage === "boss") {
          const strong = s.feedback.correct && s.feedback.attempt.confidence === "sure";
          const bossPasses = strong ? s.bossPasses + 1 : 0;
          const bossFailures = s.bossFailures + (s.feedback.correct ? 0 : 1);
          const next = { ...s, bossPasses, bossFailures };
          if (bossPasses >= 2) return finish(next, true, false);
          if (bossFailures >= 2) return finish(next, false, true);
          return boss(next);
        }
        return s;
      }
    }
  }
  return { graph, bank, initial, reducer };
}
