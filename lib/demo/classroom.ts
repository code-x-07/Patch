import type { Misconception, SkillId } from "../content/types";
import type { CourseDef } from "../course";
import { derive, type Learner } from "../engine";
import { DEMO_COURSE } from "./course";
import type { Profile } from "./script";
import { simulate } from "./simulate";

/** Eleven simulated classmates with varied profiles. First names only. */
export const CLASSMATES: Profile[] = [
  { id: "amara", name: "Amara", fails: ["S17", "S13", "S10", "S9", "S8", "S3"], prefer: ["neg_times_neg_negative"], repairs: true },
  { id: "dev", name: "Dev", fails: ["S17", "S13", "S10", "S9", "S8", "S3"], prefer: ["neg_times_neg_negative", "neg_times_pos_positive"], repairs: true },
  { id: "isla", name: "Isla", fails: ["S17", "S13", "S10", "S9", "S8", "S3"], prefer: ["neg_times_neg_negative"], repairs: true },
  { id: "kofi", name: "Kofi", fails: ["S17", "S13", "S10", "S9", "S8", "S3"], prefer: ["neg_times_neg_negative", "roots_equal_factor_constants"], repairs: false },
  { id: "ben", name: "Ben", fails: ["S17", "S13"], prefer: ["swapped_signs", "roots_equal_factor_constants"], repairs: true },
  { id: "femi", name: "Femi", fails: ["S17", "S13"], prefer: ["product_only_ignored_sum"], repairs: true },
  { id: "hugo", name: "Hugo", fails: ["S17", "S13"], prefer: ["swapped_signs"], repairs: false },
  { id: "chloe", name: "Chloe", fails: ["S17", "S16"], prefer: ["roots_equal_factor_constants"], repairs: true },
  { id: "jay", name: "Jay", fails: ["S17", "S16"], prefer: ["roots_equal_factor_constants", "thought_answer_is_zero"], repairs: true },
  { id: "ella", name: "Ella", fails: ["S17", "S13", "S10"], prefer: ["neg_times_pos_positive"], repairs: true },
  { id: "grace", name: "Grace", fails: [], repairs: true },
];

export type Member = {
  id: string;
  name: string;
  simulated: boolean;
  /** Learner state when diagnosis finished (before repair). */
  diagnosed: Learner;
  /** Learner state now. */
  current: Learner;
  rootGaps: SkillId[];
  uncertain: boolean;
  rootDefeated: boolean;
  transferVerified: boolean;
  needsTeacher: boolean;
};

export function simulatedClassmates(): Member[] {
  return CLASSMATES.map((p) => {
    const r = simulate(p);
    return {
      id: p.id, name: p.name, simulated: true,
      diagnosed: r.diagnosed, current: r.learner,
      rootGaps: r.rootGaps, uncertain: r.uncertain,
      rootDefeated: r.rootDefeated, transferVerified: r.transferVerified, needsTeacher: r.needsTeacher,
    };
  });
}

export type HeatCell = { skill: SkillId; tested: number; weak: number; share: number; level: "strong" | "mixed" | "common_gap" | "untested" };

export type ClassReport = {
  classSize: number;
  target: SkillId;
  /** Students whose diagnosis found the target failed. */
  struggling: number;
  heatmap: Record<SkillId, HeatCell>;
  distribution: { skill: SkillId | null; count: number }[];
  misconceptions: { misconception: Misconception; students: number; share: number; classWide: boolean }[];
  repair: { started: number; defeated: number; transferred: number; needsTeacher: number };
  /**
   * What to reteach. "root": the most common root gap, while most of those
   * students are still stuck. "now": once most have repaired it, the skill the
   * most students are weak at now (so the advice matches the heatmap).
   */
  recommendation:
    | { kind: "root"; skill: SkillId; target: SkillId; affected: number; stillStuck: number; classSize: number }
    | { kind: "now"; skill: SkillId; target: SkillId; weakNow: number; fixedRoot: SkillId; classSize: number }
    | null;
  status: { strong: number; developing: number; needsSupport: number };
};

const CLASS_WIDE_THRESHOLD = 0.3;

/** Aggregate class insight from the members' engine attempts. Nothing is hardcoded. */
export function classReport(members: Member[], course: Pick<CourseDef, "graph" | "target" | "bank"> = DEMO_COURSE): ClassReport {
  const { graph, target } = course;
  const misconceptions = course.bank.misconceptions;
  const classSize = members.length;
  const diagnoses = members.map((m) => ({ m, d: derive(graph, m.diagnosed) }));

  // The heatmap shows the class as it is NOW (after any repairs), so it agrees
  // with the repair numbers shown beside it.
  const now = members.map((m) => derive(graph, m.current));
  const heatmap = {} as Record<SkillId, HeatCell>;
  for (const id of graph.ids) {
    let tested = 0, weak = 0;
    for (const d of now) {
      const s = d.status[id];
      if (s !== "unknown") tested++;
      if (s === "gap" || s === "root_gap" || s === "suspect") weak++;
    }
    const share = tested ? weak / classSize : 0;
    heatmap[id] = {
      skill: id, tested, weak, share,
      level: tested === 0 ? "untested" : share >= 0.35 ? "common_gap" : share >= 0.15 ? "mixed" : "strong",
    };
  }

  const strugglingMembers = diagnoses.filter(({ d }) => d.direct[target].status !== "unknown" && d.direct[target].status !== "known");
  const counts = new Map<SkillId | null, number>();
  for (const { m } of strugglingMembers) {
    const key = m.uncertain || m.rootGaps.length === 0 ? null : m.rootGaps[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const distribution = [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => (a.skill === null ? 1 : b.skill === null ? -1 : b.count - a.count));

  const studentsByMisconception = new Map<string, Set<string>>();
  // Class-wide misconceptions come from the shared class quiz, where everyone saw the same questions.
  for (const m of members) {
    for (const a of m.diagnosed.attempts) {
      if (a.phase !== "quiz" || !a.misconceptionId || a.correct) continue;
      if (!studentsByMisconception.has(a.misconceptionId)) studentsByMisconception.set(a.misconceptionId, new Set());
      studentsByMisconception.get(a.misconceptionId)!.add(m.id);
    }
  }
  const misc = [...studentsByMisconception.entries()]
    .map(([id, set]) => ({
      misconception: misconceptions[id] ?? { id, label: id, message: "", explain: "" },
      students: set.size,
      share: set.size / classSize,
      classWide: set.size / classSize > CLASS_WIDE_THRESHOLD,
    }))
    .sort((a, b) => b.students - a.students);

  const started = members.filter((m) => m.rootGaps.length > 0);
  const repair = {
    started: started.length,
    defeated: started.filter((m) => m.rootDefeated).length,
    transferred: started.filter((m) => m.transferVerified).length,
    needsTeacher: started.filter((m) => m.needsTeacher).length,
  };

  const top = distribution.find((d) => d.skill !== null);
  let recommendation: ClassReport["recommendation"] = null;
  if (top?.skill) {
    const stillStuck = members.filter((m) => m.rootGaps[0] === top.skill && !m.rootDefeated).length;
    const weakest = graph.ids
      .filter((id) => id !== target && heatmap[id].weak > 0)
      .sort((a, b) => heatmap[b].weak - heatmap[a].weak || graph.depth[a] - graph.depth[b])[0];
    recommendation =
      stillStuck * 2 >= top.count || !weakest
        ? { kind: "root", skill: top.skill, target, affected: top.count, stillStuck, classSize }
        : { kind: "now", skill: weakest, target, weakNow: heatmap[weakest].weak, fixedRoot: top.skill, classSize };
  }

  // Status now: Strong (target solid now, or never struggled), Needs Support (flagged, uncertain,
  // or root gap not yet repaired), otherwise Developing.
  let strong = 0, needsSupport = 0;
  for (const { m } of diagnoses) {
    const now = derive(graph, m.current).status[target];
    const struggled = strugglingMembers.some((s) => s.m === m);
    if (!struggled || now === "known" || now === "inferred_known") strong++;
    else if (m.needsTeacher || m.uncertain || (m.rootGaps.length > 0 && !m.rootDefeated)) needsSupport++;
  }
  return {
    classSize, target, struggling: strugglingMembers.length, heatmap, distribution,
    misconceptions: misc, repair, recommendation,
    status: { strong, developing: classSize - strong - needsSupport, needsSupport },
  };
}
