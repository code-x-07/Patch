import { misconceptions } from "../content/misconceptions";
import { questionsForSkill } from "../content/questions";
import type { Misconception, Question, QuestionKind, SkillId } from "../content/types";
import type { Graph } from "./graph";
import { INITIAL_MASTERY, updateMastery } from "./mastery";
import type { Attempt, Confidence, Learner, Phase } from "./types";

export function createLearner(g: Graph, initial: Partial<Record<SkillId, number>> = {}): Learner {
  const mastery = {} as Record<SkillId, number>;
  for (const id of g.ids) mastery[id] = initial[id] ?? INITIAL_MASTERY;
  return { attempts: [], mastery, phaseStart: { ...mastery }, phase: null, reopened: [] };
}

export type Feedback = {
  correct: boolean;
  misconception?: Misconception;
  /** One-line message for the chosen option. */
  message?: string;
  /** Wrong-and-Sure: show the longer explanation and flag the misconception. */
  confidentlyWrong: boolean;
  /** The same misconception has now been chosen at least twice. */
  recurring: boolean;
  attempt: Attempt;
};

export function answer(
  learner: Learner,
  question: Question,
  optionIndex: number,
  confidence: Confidence,
  phase: Phase,
  hintsUsed = 0,
): { learner: Learner; feedback: Feedback } {
  const option = question.options[optionIndex];
  if (!option) throw new Error(`${question.id}: no option ${optionIndex}`);
  const newPhase = learner.phase !== phase;
  const phaseStart = newPhase ? { ...learner.mastery } : learner.phaseStart;
  const skill = question.skillId;
  const mBefore = learner.mastery[skill];
  const mAfter = updateMastery(mBefore, option.correct, confidence, phaseStart[skill]);
  const attempt: Attempt = {
    seq: learner.attempts.length + 1,
    questionId: question.id,
    skillId: skill,
    optionIndex,
    correct: option.correct,
    confidence,
    hintsUsed,
    phase,
    mBefore,
    mAfter,
    baseline: phaseStart[skill],
    ...(option.misconceptionId ? { misconceptionId: option.misconceptionId } : {}),
  };
  const misconception = option.misconceptionId ? misconceptions[option.misconceptionId] : undefined;
  const recurring =
    !!misconception && learner.attempts.some((a) => a.misconceptionId === misconception.id);
  return {
    learner: {
      ...learner,
      attempts: [...learner.attempts, attempt],
      mastery: { ...learner.mastery, [skill]: mAfter },
      phaseStart,
      phase,
    },
    feedback: {
      correct: option.correct,
      misconception,
      message: option.message ?? misconception?.message,
      confidentlyWrong: !option.correct && confidence === "sure",
      recurring,
      attempt,
    },
  };
}

export const seenQuestionIds = (learner: Learner) => new Set(learner.attempts.map((a) => a.questionId));

const KIND_ORDER: QuestionKind[] = ["diagnostic", "check", "bridge", "boss", "stretch"];

/** First unseen question for a skill, in the preferred kind order. Never repeats a question. */
export function pickUnseen(
  learner: Learner,
  skill: SkillId,
  kinds: QuestionKind[] = ["diagnostic", "check", "bridge"],
  exclude: ReadonlySet<string> = new Set(),
): Question | undefined {
  const seen = seenQuestionIds(learner);
  return questionsForSkill(skill)
    .filter((q) => kinds.includes(q.kind) && !seen.has(q.id) && !exclude.has(q.id))
    .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))[0];
}

/**
 * "That doesn't sound right": mark the skill's failed attempts as disputed and
 * reopen it as suspect. Old disputed attempts can never reconfirm the gap; new,
 * distinct questions are needed.
 */
export function dispute(learner: Learner, skill: SkillId): Learner {
  return {
    ...learner,
    attempts: learner.attempts.map((a) => (a.skillId === skill && !a.correct ? { ...a, disputed: true } : a)),
    reopened: learner.reopened.includes(skill) ? learner.reopened : [...learner.reopened, skill],
  };
}
