export type SkillId =
  | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9" | "S10"
  | "S11" | "S12" | "S13" | "S14" | "S15" | "S16" | "S17" | "S18" | "S19";

export type QuestionKind = "diagnostic" | "check" | "bridge" | "boss" | "stretch";

export type Lesson = {
  /** The one idea, in a sentence or two. */
  idea: string;
  /** Optional sign grid for integer skills. */
  signGrid?: boolean;
  example: { prompt: string; steps: string[] };
  /** Common mistake, matching a misconception tag. */
  mistake: string;
  /** One self-check line. */
  selfCheck: string;
};

export type Skill = {
  id: SkillId;
  /** Canonical student-facing display name. Use everywhere. */
  name: string;
  /** Compact label for dense map nodes, defined once here. */
  short: string;
  description: string;
  prereqs: SkillId[];
  lesson: Lesson;
};

export type Option = {
  text: string;
  correct: boolean;
  misconceptionId?: string;
  message?: string;
};

/**
 * Machine-checkable description of the maths, used only by the content
 * verification tests (never shipped as an answer key in Live Mode).
 */
export type Verify =
  | { type: "num"; expr: string }
  | { type: "poly"; expr: string }
  | { type: "roots"; expr: string }
  | { type: "predicate"; fn: string }
  | { type: "pair"; product: number; sum: number };

export type Question = {
  id: string;
  skillId: SkillId;
  kind: QuestionKind;
  tier: 1 | 2 | 3;
  text: string;
  options: Option[];
  hint1?: string;
  hint2?: string;
  verify: Verify;
};

export type Misconception = {
  id: string;
  label: string;
  /** Short one-line message in the student's voice. */
  message: string;
  /** Longer explanation shown after a confident wrong answer. */
  explain: string;
};
