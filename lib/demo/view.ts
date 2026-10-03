import type { SkillId } from "../content/types";
import type { CourseInfo } from "../course";
import { derive, isSolid } from "../engine/evidence";
import type { Derived, Learner, Status } from "../engine/types";
import type { DemoState } from "./flow";

export { lc } from "../text";

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
export function estimateRemaining(course: CourseInfo, derived: Derived): number {
  const { direct, status } = derived;
  let n = 0;
  for (const id of course.scope) {
    const d = direct[id];
    if (d.status === "suspect") n += 1;
    const failed = d.status === "suspect" || d.status === "gap";
    if (failed) {
      for (const p of course.graph.prereqs[id]) {
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

/** Describe each skill's evidence in a few plain words, from the actual attempts. */
export function evidenceFor(course: CourseInfo, learner: Learner, skill: SkillId, derived = derive(course.graph, learner)): EvidenceRow {
  const d = derived.direct[skill];
  const status = derived.status[skill];
  const attempts = learner.attempts.filter((a) => a.skillId === skill && !a.disputed);
  const fails = attempts.filter((a) => !a.correct).length;
  const strong = attempts.filter((a) => a.correct && a.confidence === "sure" && a.hintsUsed === 0).length;
  let detail: string;
  let kind: EvidenceRow["kind"];
  if (status === "inferred_known") {
    const from = derived.inferredFrom[skill] ?? [];
    detail = `Inferred from ${from.map((f) => course.skillById[f].short).join(", ")}`;
    kind = "inferred";
  } else if (d.status === "gap" || status === "root_gap") {
    detail = `${fails} wrong`;
    kind = "failed";
  } else if (d.status === "known") {
    detail = `${d.passQs.length} right, sure`;
    kind = "direct";
  } else if (d.status === "suspect") {
    detail = strong > 0 ? `${fails} wrong, ${strong} right` : "1 wrong";
    kind = fails > 0 && strong > 0 ? "mixed" : "failed";
  } else {
    detail = attempts.length ? `${attempts.length} answered, not confirmed` : "Not tested";
    kind = "mixed";
  }
  return { skill, name: course.skillById[skill].name, status, detail, kind };
}

/** The failed chain from the target down to the root gap, following graph edges. */
export function failedChain(course: CourseInfo, derived: Derived, root: SkillId): SkillId[] {
  const weak = (id: SkillId) => ["suspect", "gap", "root_gap"].includes(derived.status[id]);
  const dfs = (id: SkillId, path: SkillId[]): SkillId[] | null => {
    if (id === root) return [...path, id];
    for (const p of course.graph.prereqs[id]) {
      if (weak(p) || p === root) {
        const r = dfs(p, [...path, id]);
        if (r) return r;
      }
    }
    return null;
  };
  return dfs(course.target, []) ?? [course.target, root];
}
