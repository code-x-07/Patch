import { TARGET_SKILL } from "../content/skills";
import type { Question, SkillId } from "../content/types";
import {
  answer,
  applyDiagnosisEstimates,
  createLearner,
  derive,
  dispute,
  graph,
  nextBoss,
  nextProbe,
  pickUnseen,
  planMission,
  type Confidence,
  type Feedback,
  type Learner,
  type MissionPlan,
  type Phase,
} from "../engine";
import { QUIZ } from "./script";

export type Stage = "intro" | "quiz" | "report" | "trace" | "reveal" | "mission" | "boss" | "victory" | "map" | "teacher";

export type Role = "quiz" | "probe" | "practice" | "bridge" | "extra" | "boss" | "confirm";

export type Current = { question: Question; phase: Phase; role: Role };

export type ProbeRecord = {
  skill: SkillId;
  questionId: string;
  correct: boolean;
  reason: "confirm" | "prerequisite" | "verify";
  /** The failed skill that led the trace here (edge from skill → from), if any. */
  from: SkillId | null;
};

export type DemoState = {
  stage: Stage;
  learner: Learner;
  fast: boolean;
  quizIndex: number;
  current: Current | null;
  feedback: Feedback | null;
  probes: ProbeRecord[];
  pendingReason: ProbeRecord["reason"] | null;
  /** The failed skill the trace is arriving from for the current probe. */
  pendingFrom: SkillId | null;
  diagnosis: { rootGaps: SkillId[]; uncertain: boolean; unresolved: SkillId[] } | null;
  /** Learner at the end of diagnosis, before repair. */
  diagnosed: Learner | null;
  disputes: SkillId[];
  mission: { plan: MissionPlan; step: "lesson" | "practice" | "bridge"; index: number } | null;
  boss: { failures: number; guesses: number };
  result: { rootDefeated: boolean; transferVerified: boolean; needsTeacher: boolean } | null;
};

export type Action =
  | { type: "start" }
  | { type: "answer"; optionIndex: number; confidence: Confidence }
  | { type: "continue" }
  | { type: "trace" }
  | { type: "dispute" }
  | { type: "beginMission" }
  | { type: "lessonDone" }
  | { type: "goto"; stage: "map" | "teacher" | "victory" | "reveal" | "report" }
  | { type: "toggleFast" }
  | { type: "reset" };

export function initialState(fast = false): DemoState {
  return {
    stage: "intro",
    learner: createLearner(graph),
    fast,
    quizIndex: 0,
    current: null,
    feedback: null,
    probes: [],
    pendingReason: null,
    pendingFrom: null,
    diagnosis: null,
    diagnosed: null,
    disputes: [],
    mission: null,
    boss: { failures: 0, guesses: 0 },
    result: null,
  };
}

/** Which failed skill the trace came from to reach `skill`, for drawing the beam. */
function traceSource(state: DemoState, skill: SkillId): SkillId | null {
  const { direct } = derive(graph, state.learner);
  const dependents = graph.dependents[skill].filter(
    (d) => direct[d].status === "suspect" || direct[d].status === "gap",
  );
  if (dependents.length === 0) return null;
  // Prefer the dependent probed most recently, so the beam follows the trail.
  for (let i = state.probes.length - 1; i >= 0; i--) {
    if (dependents.includes(state.probes[i].skill)) return state.probes[i].skill;
  }
  return dependents.includes(TARGET_SKILL) ? TARGET_SKILL : dependents[0];
}

function probeOrFinish(state: DemoState): DemoState {
  const step = nextProbe(graph, state.learner, TARGET_SKILL);
  if (!step.done) {
    return {
      ...state,
      stage: "trace",
      feedback: null,
      current: { question: step.question, phase: "probe", role: "probe" },
      pendingReason: step.reason,
      pendingFrom: traceSource(state, step.skill),
    };
  }
  const learner = { ...state.learner, mastery: applyDiagnosisEstimates(state.learner.mastery, step.derived) };
  return {
    ...state,
    stage: "reveal",
    learner,
    diagnosed: learner,
    feedback: null,
    current: null,
    pendingReason: null,
    pendingFrom: null,
    diagnosis: { rootGaps: step.rootGaps, uncertain: step.uncertain, unresolved: step.unresolved },
  };
}

function toBoss(state: DemoState): DemoState {
  const q = nextBoss(state.learner, TARGET_SKILL);
  if (!q) return finish({ ...state, feedback: null }, false, true);
  return { ...state, stage: "boss", feedback: null, current: { question: q, phase: "boss", role: "boss" } };
}

function finish(state: DemoState, transferVerified: boolean, needsTeacher: boolean): DemoState {
  const root = state.mission?.plan.root ?? state.diagnosis?.rootGaps[0];
  const rootDefeated = !!root && derive(graph, state.learner).direct[root].status === "known";
  return {
    ...state,
    stage: "victory",
    current: null,
    feedback: null,
    result: { rootDefeated, transferVerified, needsTeacher },
  };
}

function advanceMission(state: DemoState): DemoState {
  const m = state.mission!;
  const { practice, bridges } = m.plan;
  if (m.step === "practice" && m.index + 1 < practice.length) {
    const index = m.index + 1;
    return { ...state, feedback: null, mission: { ...m, index }, current: { question: practice[index], phase: "mission", role: "practice" } };
  }
  const nextBridge = m.step === "practice" ? 0 : m.index + 1;
  if (nextBridge < bridges.length) {
    return {
      ...state,
      feedback: null,
      mission: { ...m, step: "bridge", index: nextBridge },
      current: { question: bridges[nextBridge], phase: "mission", role: "bridge" },
    };
  }
  return toBoss(state);
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "start":
      return { ...initialState(state.fast), stage: "quiz", current: { question: QUIZ[0], phase: "quiz", role: "quiz" } };

    case "answer": {
      if (!state.current || state.feedback) return state;
      const { question, phase } = state.current;
      const r = answer(state.learner, question, action.optionIndex, action.confidence, phase);
      let probes = state.probes;
      if (state.current.role === "probe") {
        probes = [
          ...probes,
          {
            skill: question.skillId,
            questionId: question.id,
            correct: r.feedback.correct,
            reason: state.pendingReason ?? "prerequisite",
            from: state.pendingFrom,
          },
        ];
      }
      return { ...state, learner: r.learner, feedback: r.feedback, probes };
    }

    case "continue": {
      if (!state.current || !state.feedback) return state;
      const { role } = state.current;
      const fb = state.feedback;
      switch (role) {
        case "quiz": {
          const i = state.quizIndex + 1;
          if (i < QUIZ.length) {
            return { ...state, quizIndex: i, feedback: null, current: { question: QUIZ[i], phase: "quiz", role: "quiz" } };
          }
          return { ...state, stage: "report", feedback: null, current: null };
        }
        case "probe":
          return probeOrFinish(state);
        case "practice":
        case "bridge":
          return advanceMission(state);
        case "extra":
          return toBoss(state);
        case "boss": {
          if (fb.correct && fb.attempt.confidence === "sure") {
            const confirm = nextBoss(state.learner, TARGET_SKILL);
            if (!confirm) return finish(state, true, false);
            return { ...state, feedback: null, current: { question: confirm, phase: "boss", role: "confirm" } };
          }
          if (fb.correct) {
            // Right but guessed: not yet proof. Try another unseen variant.
            const guesses = state.boss.guesses + 1;
            return toBoss({ ...state, boss: { ...state.boss, guesses } });
          }
          const failures = state.boss.failures + 1;
          const next = { ...state, boss: { ...state.boss, failures } };
          if (failures >= 2) return finish(next, false, true);
          const plan = state.mission!.plan;
          const lastStep = plan.path[plan.path.length - 2] ?? plan.root;
          const extra = pickUnseen(state.learner, lastStep, ["bridge", "check", "diagnostic"]);
          if (!extra) return toBoss(next);
          return { ...next, feedback: null, current: { question: extra, phase: "mission", role: "extra" } };
        }
        case "confirm":
          return finish(state, true, false);
      }
      return state;
    }

    case "trace":
      if (state.stage !== "report") return state;
      return probeOrFinish(state);

    case "dispute": {
      const root = state.diagnosis?.rootGaps[0];
      if (!root || state.stage !== "reveal") return state;
      const learner = dispute(state.learner, root);
      return probeOrFinish({ ...state, learner, disputes: [...state.disputes, root], diagnosis: null });
    }

    case "beginMission": {
      const root = state.diagnosis?.rootGaps[0];
      if (!root) return state;
      const plan = planMission(graph, state.learner, root, TARGET_SKILL, state.fast);
      return { ...state, stage: "mission", mission: { plan, step: "lesson", index: 0 }, current: null, feedback: null };
    }

    case "lessonDone": {
      const m = state.mission;
      if (!m || m.step !== "lesson") return state;
      if (m.plan.practice.length === 0) return toBoss(state);
      return {
        ...state,
        mission: { ...m, step: "practice", index: 0 },
        current: { question: m.plan.practice[0], phase: "mission", role: "practice" },
      };
    }

    case "goto":
      return { ...state, stage: action.stage };

    case "toggleFast":
      return { ...state, fast: !state.fast };

    case "reset":
      return initialState(state.fast);
  }
}
