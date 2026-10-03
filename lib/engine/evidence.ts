import type { SkillId } from "../content/types";
import { ancestors, byId, descendants, type Graph } from "./graph";
import type { Attempt, Derived, DirectEvidence, Learner, Status } from "./types";

/** A Correct-and-Sure answer with no hints: the only kind that counts toward a direct pass. */
export const isStrongPass = (a: Attempt) => a.correct && a.confidence === "sure" && a.hintsUsed === 0;

/**
 * Replay a learner's attempts to get each skill's directly tested state.
 *
 * - Two distinct strong passes since the last failure → known.
 * - Two distinct failures since the skill was last known → gap; one → suspect.
 * - A strong pass after failures reopens a gap to suspect (evidence is now mixed).
 * - Correct-and-Guess is evidence only; it never confirms anything.
 * - Disputed attempts are ignored; a reopened skill with no fresh evidence is suspect.
 */
export function directEvidence(g: Graph, learner: Learner): Record<SkillId, DirectEvidence> {
  const out = {} as Record<SkillId, DirectEvidence>;
  for (const id of g.ids) out[id] = { status: "unknown", passQs: [], failQs: [] };

  for (const a of learner.attempts) {
    if (a.disputed) continue;
    const e = out[a.skillId];
    if (a.correct) {
      if (!isStrongPass(a)) continue;
      if (!e.passQs.includes(a.questionId)) e.passQs = [...e.passQs, a.questionId];
      if (e.passQs.length >= 2) {
        e.status = "known";
        e.failQs = [];
      } else if (e.failQs.length > 0) {
        e.status = "suspect";
      }
    } else {
      e.passQs = [];
      if (!e.failQs.includes(a.questionId)) e.failQs = [...e.failQs, a.questionId];
      e.status = e.failQs.length >= 2 ? "gap" : "suspect";
    }
  }

  for (const id of learner.reopened) {
    if (out[id].status === "unknown") out[id].status = "suspect";
  }
  return out;
}

const isFailed = (s: Status) => s === "suspect" || s === "gap" || s === "root_gap";
export const isSolid = (s: Status) => s === "known" || s === "inferred_known";

/**
 * Derive every skill's status. Inference is recomputed from scratch each time,
 * so contradictory evidence on a skill (or on the skill an inference came from)
 * immediately removes the inference and reopens the branch.
 */
export function derive(g: Graph, learner: Learner): Derived {
  const direct = directEvidence(g, learner);
  const status = {} as Record<SkillId, Status>;
  const inferredFrom: Partial<Record<SkillId, SkillId[]>> = {};

  for (const id of g.ids) status[id] = direct[id].status;

  for (const k of [...g.ids].sort(byId)) {
    if (direct[k].status !== "known") continue;
    for (const a of ancestors(g, k)) {
      // Only uncontradicted, not directly known skills can be inferred.
      if (direct[a].status !== "unknown") continue;
      status[a] = "inferred_known";
      (inferredFrom[a] ??= []).push(k);
    }
  }

  const rootGaps = g.ids
    .filter((id) => direct[id].status === "gap" && g.prereqs[id].every((p) => isSolid(status[p])))
    .map((id) => ({ id, explains: [...descendants(g, id)].filter((d) => isFailed(status[d])).length }))
    .sort((a, b) => b.explains - a.explains || byId(a.id, b.id))
    .map((r) => r.id);

  for (const id of rootGaps) status[id] = "root_gap";

  return { status, direct, inferredFrom, rootGaps };
}
