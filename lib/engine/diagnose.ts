import type { Question, SkillId } from "../content/types";
import { derive, isSolid } from "./evidence";
import { ancestors, byId, type Graph } from "./graph";
import { pickUnseen, type ContentBank } from "./learner";
import type { Derived, Learner } from "./types";

export type ProbeStep =
  | { done: false; skill: SkillId; question: Question; reason: "confirm" | "prerequisite" | "verify"; derived: Derived }
  | { done: true; rootGaps: SkillId[]; uncertain: boolean; unresolved: SkillId[]; derived: Derived };

/**
 * Choose the next diagnostic probe (section 4.3).
 *
 * Candidates are skills in the target's prerequisite tree that are suspect and
 * need confirmation, plus unresolved prerequisites of failed skills. Pick the
 * one with the most unresolved ancestors; break ties by lowest depth, then id.
 * Root Gap verification: a root-gap candidate's direct prerequisites that are
 * only inferred are tested directly, so the foundation under the reported
 * cause rests on direct evidence where questions allow.
 * Stop when no candidate remains; report uncertainty instead of forcing a gap.
 */
export function nextProbe(g: Graph, learner: Learner, target: SkillId, bank?: ContentBank): ProbeStep {
  // Generated sessions reserve check/bridge questions for repair, so diagnostic
  // probes cannot consume the two independent checks needed by the mission.
  const pick = (id: SkillId) => pickUnseen(learner, id, bank ? ["diagnostic"] : undefined, undefined, bank);
  const derived = derive(g, learner);
  const { status, direct } = derived;
  const scope = new Set<SkillId>([target, ...ancestors(g, target)]);
  const failed = (id: SkillId) => direct[id].status === "suspect" || direct[id].status === "gap";

  const candidates = new Set<SkillId>();
  for (const id of scope) {
    if (direct[id].status === "suspect") candidates.add(id);
    if (failed(id)) {
      for (const p of g.prereqs[id]) {
        if (scope.has(p) && !isSolid(status[p]) && direct[p].status !== "gap") candidates.add(p);
      }
    }
  }

  const verify = new Set<SkillId>();
  for (const root of derived.rootGaps) {
    if (!scope.has(root)) continue;
    for (const p of g.prereqs[root]) if (status[p] === "inferred_known") verify.add(p);
  }

  const exhausted: SkillId[] = [];
  const askable = [...candidates].filter((id) => {
    const ok = !!pick(id);
    if (!ok) exhausted.push(id);
    return ok;
  });

  // Verification of the foundation happens once branch exploration is finished.
  const verifiable = [...verify].filter((id) => pick(id)).sort(byId);
  if (askable.length === 0 && verifiable.length > 0) {
    const skill = verifiable[0];
    return { done: false, skill, question: pick(skill)!, reason: "verify", derived };
  }

  if (askable.length === 0) {
    const targetFailed = failed(target);
    const rootGaps = bank ? derived.rootGaps.filter((id) => scope.has(id)) : derived.rootGaps;
    return {
      done: true,
      rootGaps,
      uncertain: (targetFailed && rootGaps.length === 0) || exhausted.length > 0 || (!!bank && [...verify].some((id) => !pick(id))),
      unresolved: exhausted.sort(byId),
      derived,
    };
  }

  const unresolvedAncestors = (id: SkillId) => [...ancestors(g, id)].filter((a) => !isSolid(status[a])).length;
  askable.sort(
    (a, b) => unresolvedAncestors(b) - unresolvedAncestors(a) || g.depth[a] - g.depth[b] || byId(a, b),
  );
  const skill = askable[0];
  return {
    done: false,
    skill,
    question: pick(skill)!,
    reason: direct[skill].status === "suspect" ? "confirm" : "prerequisite",
    derived,
  };
}
