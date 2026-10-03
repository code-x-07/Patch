import { TARGET_SKILL } from "../content/skills";
import type { Question, SkillId } from "../content/types";
import {
  answer,
  applyDiagnosisEstimates,
  createLearner,
  derive,
  graph,
  nextBoss,
  nextProbe,
  pickUnseen,
  planMission,
  type Learner,
  type MissionPlan,
  type Phase,
} from "../engine";
import { QUIZ, scriptedAnswer, type Profile } from "./script";

export type SimResult = {
  profile: Profile;
  learner: Learner;
  /** Learner state at the end of diagnosis, before any repair. */
  diagnosed: Learner;
  probes: { skill: SkillId; questionId: string; correct: boolean }[];
  rootGaps: SkillId[];
  uncertain: boolean;
  mission?: MissionPlan;
  rootDefeated: boolean;
  transferVerified: boolean;
  needsTeacher: boolean;
};

const MAX_PROBES = 40;

/** Run a scripted profile through quiz → diagnosis → mission → Boss Fight with the shared engine. */
export function simulate(profile: Profile, opts: { fast?: boolean } = {}): SimResult {
  let learner = createLearner(graph);
  const ask = (q: Question, phase: Phase) => {
    const choice = scriptedAnswer(profile, q, phase);
    const r = answer(learner, q, choice.optionIndex, choice.confidence, phase);
    learner = r.learner;
    return r.feedback;
  };

  for (const q of QUIZ) ask(q, "quiz");

  const probes: SimResult["probes"] = [];
  let step = nextProbe(graph, learner, TARGET_SKILL);
  while (!step.done && probes.length < MAX_PROBES) {
    const fb = ask(step.question, "probe");
    probes.push({ skill: step.skill, questionId: step.question.id, correct: fb.correct });
    step = nextProbe(graph, learner, TARGET_SKILL);
  }
  if (!step.done) throw new Error("diagnosis did not terminate");
  learner = { ...learner, mastery: applyDiagnosisEstimates(learner.mastery, step.derived) };
  const diagnosed = learner;

  const result: SimResult = {
    profile, learner, diagnosed, probes,
    rootGaps: step.rootGaps, uncertain: step.uncertain,
    rootDefeated: false, transferVerified: false, needsTeacher: false,
  };
  if (step.rootGaps.length === 0) return result;

  const root = step.rootGaps[0];
  const mission = planMission(graph, learner, root, TARGET_SKILL, opts.fast);
  result.mission = mission;
  for (const q of mission.practice) ask(q, "mission");
  for (const q of mission.bridges) ask(q, "mission");
  result.rootDefeated = derive(graph, learner).direct[root].status === "known";

  // Boss Fight: up to two attempts, with one extra bridge check between them.
  for (let tryNo = 0; tryNo < 2; tryNo++) {
    const boss = nextBoss(learner, TARGET_SKILL);
    if (!boss) break;
    const fb = ask(boss, "boss");
    if (fb.correct && fb.attempt.confidence === "sure") {
      result.transferVerified = true;
      const confirm = nextBoss(learner, TARGET_SKILL);
      if (confirm) ask(confirm, "boss");
      break;
    }
    if (tryNo === 0) {
      const lastStep = mission.path[mission.path.length - 2] ?? root;
      const extra = pickUnseen(learner, lastStep, ["bridge", "check", "diagnostic"]);
      if (extra) ask(extra, "mission");
    } else {
      result.needsTeacher = true;
    }
  }
  result.learner = learner;
  return result;
}
