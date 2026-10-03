import { questionById } from "../content/questions";
import { skillById, TARGET_SKILL } from "../content/skills";
import type { SkillId } from "../content/types";
import { ancestors, derive, graph, isSolid, type Derived, type Learner, type Status } from "../engine";
import type { DemoState } from "./flow";

/** Lower-case the first letter of a name for use mid-sentence. */
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const TARGET_SCOPE: ReadonlySet<SkillId> = new Set<SkillId>([TARGET_SKILL, ...ancestors(graph, TARGET_SKILL)]);

/** Status shown on the map: the derived status, with the mission's root shown as Repairing. */
export function displayStatus(state: DemoState, derived: Derived): Record<SkillId, Status> {
  const out = { ...derived.status };
  const root = state.mission?.plan.root;
  if (root && (state.stage === "mission" || state.stage === "boss") && derived.direct[root].status !== "known") {
    out[root] = "repairing";
  }
  return out;
}

/** Rough count of probes still needed, for the "question 5 of about 12" counter. */
export function estimateRemaining(derived: Derived): number {
  const { direct, status } = derived;
  let n = 0;
  for (const id of TARGET_SCOPE) {
    const d = direct[id];
    if (d.status === "suspect") n += 1;
    const failed = d.status === "suspect" || d.status === "gap";
    if (failed) {
      for (const p of graph.prereqs[id]) {
        if (!isSolid(status[p]) && direct[p].status === "unknown") n += Math.max(0, 2 - direct[p].passQs.length);
      }
    }
  }
  return n;
}

export type EvidenceRow = {
  skill: SkillId;
  name: string;
  status: Status;
  detail: string;
  kind: "failed" | "direct" | "inferred" | "mixed";
};

/** Describe each skill's evidence in plain words, from the actual attempts. */
export function evidenceFor(learner: Learner, skill: SkillId, derived = derive(graph, learner)): EvidenceRow {
  const d = derived.direct[skill];
  const status = derived.status[skill];
  const attempts = learner.attempts.filter((a) => a.skillId === skill && !a.disputed);
  const fails = attempts.filter((a) => !a.correct).length;
  const strong = attempts.filter((a) => a.correct && a.confidence === "sure" && a.hintsUsed === 0).length;
  let detail: string;
  let kind: EvidenceRow["kind"];
  if (status === "inferred_known") {
    const from = derived.inferredFrom[skill] ?? [];
    detail = `Inferred from ${from.map((f) => skillById[f].name).join(" and ")}, not directly tested`;
    kind = "inferred";
  } else if (d.status === "gap" || status === "root_gap") {
    detail = `${fails} different questions wrong`;
    kind = "failed";
  } else if (d.status === "known") {
    detail = `${d.passQs.length} different questions right, sure, no hints`;
    kind = "direct";
  } else if (d.status === "suspect") {
    detail = strong > 0 ? `Mixed: ${fails} wrong, ${strong} right` : `1 question wrong, not yet confirmed`;
    kind = fails > 0 && strong > 0 ? "mixed" : "failed";
  } else {
    detail = attempts.length ? `${attempts.length} answer${attempts.length > 1 ? "s" : ""}, not enough to confirm` : "Not tested";
    kind = "mixed";
  }
  return { skill, name: skillById[skill].name, status, detail, kind };
}

/** The failed chain from the target down to the root gap, following graph edges. */
export function failedChain(derived: Derived, root: SkillId, target: SkillId = TARGET_SKILL): SkillId[] {
  const weak = (id: SkillId) => ["suspect", "gap", "root_gap"].includes(derived.status[id]);
  // DFS down prerequisites from the target, staying on failed skills, until the root.
  const dfs = (id: SkillId, path: SkillId[]): SkillId[] | null => {
    if (id === root) return [...path, id];
    for (const p of graph.prereqs[id]) {
      if (weak(p) || p === root) {
        const r = dfs(p, [...path, id]);
        if (r) return r;
      }
    }
    return null;
  };
  return dfs(target, []) ?? [target, root];
}

export const questionText = (id: string) => questionById[id]?.text ?? id;
