// Shapes sent from Patch's server to Live Mode browsers. Nothing here may carry
// an answer key for a question the student hasn't answered yet.
import type { SkillId } from "../content/types";
import type { ProbeRecord, Role, Stage } from "../demo/flow";
import type { Confidence, Phase, Status } from "../engine/types";

export type PublicOption = { text: string; /** Present only after the student answered. */ correct?: boolean };

export type PublicQuestion = { id: string; skillId: SkillId; text: string; options: PublicOption[] };

export type LiveFeedback = {
  correct: boolean;
  optionIndex: number;
  confidence: Confidence;
  message?: string;
  misconception?: { label: string; explain: string };
  confidentlyWrong: boolean;
  recurring: boolean;
};

export type EvidenceRowView = { skill: SkillId; name: string; status: Status; detail: string };

export type LiveView = {
  stage: Stage;
  fast: boolean;
  quizIndex: number;
  quizTotal: number;
  current: { question: PublicQuestion; role: Role; phase: Phase } | null;
  feedback: LiveFeedback | null;
  status: Record<SkillId, Status>;
  probes: ProbeRecord[];
  pendingReason: ProbeRecord["reason"] | null;
  pendingFrom: SkillId | null;
  remaining: number;
  diagnosis: { rootGaps: SkillId[]; uncertain: boolean; unresolved: SkillId[] } | null;
  disputes: SkillId[];
  report: {
    percent: number;
    correct: number;
    total: number;
    improvement: number;
    mistakes: number;
    guesses: number;
    confidentlyWrong: number;
    /** Labels of misconceptions chosen at least twice. */
    recurring: string[];
    targetFailed: boolean;
    rows: { text: string; expected: number; correct: boolean; confidence: Confidence; points: number }[];
  } | null;
  reveal: { chain: SkillId[]; rows: EvidenceRowView[]; others: EvidenceRowView[] } | null;
  mission: {
    root: SkillId;
    target: SkillId;
    path: SkillId[];
    step: "lesson" | "practice" | "bridge";
    index: number;
    practiceCount: number;
    bridgeCount: number;
    recap: { text: string; chosen: string }[];
  } | null;
  result: { rootDefeated: boolean; transferVerified: boolean; needsTeacher: boolean } | null;
  /** Skills that failed earlier and now have one strong pass ("rising"). */
  rising: SkillId[];
  /** For the Knowledge Map inspector: evidence and the student's own answers per skill. */
  evidence: Partial<Record<SkillId, { detail: string; answers: { text: string; correct: boolean; confidence: Confidence; disputed?: boolean }[] }>>;
};

export type ClassInfo = { id: string; name: string; joinCode: string; state: "lobby" | "live" | "finished" };
