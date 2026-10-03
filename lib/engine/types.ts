import type { SkillId } from "../content/types";

export type Status =
  | "unknown"
  | "known"
  | "inferred_known"
  | "suspect"
  | "gap"
  | "root_gap"
  | "repairing"
  | "retention_due";

export type DirectStatus = "unknown" | "known" | "suspect" | "gap";

export type Confidence = "sure" | "guess";

export type Phase = "quiz" | "probe" | "mission" | "boss";

export type Attempt = {
  seq: number;
  questionId: string;
  skillId: SkillId;
  optionIndex: number;
  correct: boolean;
  confidence: Confidence;
  hintsUsed: number;
  phase: Phase;
  /** Mastery estimate immediately before this attempt. */
  mBefore: number;
  /** Mastery estimate after this attempt. */
  mAfter: number;
  /** The skill's mastery at the start of this phase (the improvement baseline). */
  baseline: number;
  misconceptionId?: string;
  /** Excluded from evidence after the student disputed the diagnosis. */
  disputed?: boolean;
};

export type Learner = {
  attempts: Attempt[];
  mastery: Record<SkillId, number>;
  /** Mastery at the start of the current phase, for the per-session cap. */
  phaseStart: Record<SkillId, number>;
  phase: Phase | null;
  /** Skills reopened by a disputed diagnosis. */
  reopened: SkillId[];
};

export type DirectEvidence = {
  status: DirectStatus;
  /** Distinct questions passed Correct-and-Sure, independently, since the last failure. */
  passQs: string[];
  /** Distinct questions failed since the skill was last directly known. */
  failQs: string[];
};

export type Derived = {
  status: Record<SkillId, Status>;
  direct: Record<SkillId, DirectEvidence>;
  /** For inferred_known skills: the directly known skills the inference comes from. */
  inferredFrom: Partial<Record<SkillId, SkillId[]>>;
  /** Verified root gaps, ranked by how many failed downstream skills they explain. */
  rootGaps: SkillId[];
};
