import type { SkillId } from "../content/types";
import type { Confidence, Derived } from "./types";

export const INITIAL_MASTERY = 0.5;
export const PER_SESSION_CAP = 0.2;

/** Learning rate by outcome and confidence (section 5.1). */
export function learningRate(correct: boolean, confidence: Confidence): number {
  if (correct && confidence === "guess") return 0.07;
  if (!correct && confidence === "sure") return 0.2;
  return 0.15;
}

/**
 * m_new = m_old + k (result − m_old), clamped so a skill moves at most
 * PER_SESSION_CAP away from where it started this quiz/session.
 */
export function updateMastery(m: number, correct: boolean, confidence: Confidence, sessionStart: number): number {
  const k = learningRate(correct, confidence);
  const next = m + k * ((correct ? 1 : 0) - m);
  const lo = Math.max(0, sessionStart - PER_SESSION_CAP);
  const hi = Math.min(1, sessionStart + PER_SESSION_CAP);
  return Math.min(hi, Math.max(lo, next));
}

/**
 * After a diagnosis: confirmed gaps drop to at most 0.2, inferred skills rise to
 * at least 0.8. Inference never lowers a stronger estimate and never touches a
 * skill with contradictory direct evidence (those are not inferred_known).
 */
export function applyDiagnosisEstimates(mastery: Record<SkillId, number>, derived: Derived): Record<SkillId, number> {
  const out = { ...mastery };
  for (const id of Object.keys(out) as SkillId[]) {
    const s = derived.status[id];
    if (s === "gap" || s === "root_gap") out[id] = Math.min(out[id], 0.2);
    if (s === "inferred_known") out[id] = Math.max(out[id], 0.8);
  }
  return out;
}
