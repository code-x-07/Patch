import { questionById } from "../content/questions";
import type { Question, SkillId } from "../content/types";
import type { Confidence, Phase } from "../engine/types";

/** The class quiz on the common objective (Quadratic equations). Same for everyone. */
export const QUIZ: Question[] = ["S14-d", "S10-d", "S16-d", "S12-d", "S13-d", "S11-d", "S9-d", "S17-d"].map(
  (id) => questionById[id],
);

export type Profile = {
  id: string;
  name: string;
  /** Skills this student gets wrong (until a repair mission). */
  fails: SkillId[];
  /** Questions answered with Guess rather than Sure. */
  guessOn?: string[];
  /** Skills where the student guesses, so correct answers never confirm anything. */
  guessSkills?: SkillId[];
  /** Preferred misconceptions when picking a wrong option. */
  prefer?: string[];
  /** Whether the repair mission works for this student. */
  repairs: boolean;
};

/** Section 10.3: fails S17, S13, S10, S9, S8, S3 and passes every other skill. */
export const DEMO_STUDENT: Profile = {
  id: "you",
  name: "You",
  fails: ["S17", "S13", "S10", "S9", "S8", "S3"],
  guessOn: ["S13-d"],
  prefer: ["neg_times_neg_negative", "neg_times_pos_positive", "roots_equal_factor_constants", "swapped_signs"],
  repairs: true,
};

export type ScriptedChoice = { optionIndex: number; confidence: Confidence };

export function scriptedAnswer(profile: Profile, q: Question, phase: Phase): ScriptedChoice {
  const repairing = phase === "mission" || phase === "boss";
  const fails = profile.fails.includes(q.skillId) && !(repairing && profile.repairs);
  const failsInRepair = repairing && !profile.repairs;
  const guess = profile.guessOn?.includes(q.id) || profile.guessSkills?.includes(q.skillId);
  const confidence: Confidence = guess ? "guess" : "sure";
  if (!fails && !failsInRepair) {
    return { optionIndex: q.options.findIndex((o) => o.correct), confidence };
  }
  const wrong = q.options.map((o, i) => ({ o, i })).filter(({ o }) => !o.correct);
  for (const m of profile.prefer ?? []) {
    const hit = wrong.find(({ o }) => o.misconceptionId === m);
    if (hit) return { optionIndex: hit.i, confidence };
  }
  return { optionIndex: wrong[0].i, confidence };
}
