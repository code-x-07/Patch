import type { Question, SkillId } from "../content/types";
import { derive } from "./evidence";
import { shortestPath, type Graph } from "./graph";
import { pickUnseen } from "./learner";
import type { Learner } from "./types";

/** Repair path from the root gap up to the target (section 4.5). */
export function repairPath(g: Graph, learner: Learner, root: SkillId, target: SkillId): SkillId[] {
  const { status } = derive(g, learner);
  const weak = (id: SkillId) => ["suspect", "gap", "root_gap"].includes(status[id]);
  return shortestPath(g, root, target, weak) ?? [root];
}

export type MissionPlan = {
  root: SkillId;
  target: SkillId;
  path: SkillId[];
  /** Two distinct, unseen check variants on the root gap. */
  practice: Question[];
  /** One bridge question per intermediate skill (empty in Demo Fast Mode). */
  bridges: Question[];
  fast: boolean;
};

export function planMission(g: Graph, learner: Learner, root: SkillId, target: SkillId, fast = false): MissionPlan {
  const path = repairPath(g, learner, root, target);
  const reserved = new Set<string>();
  const practice: Question[] = [];
  for (let i = 0; i < 2; i++) {
    const q = pickUnseen(learner, root, ["check", "bridge", "diagnostic"], reserved);
    if (!q) break;
    practice.push(q);
    reserved.add(q.id);
  }
  const bridges: Question[] = [];
  if (!fast) {
    for (const id of path.slice(1, -1)) {
      const q = pickUnseen(learner, id, ["bridge", "check", "diagnostic"], reserved);
      if (q) { bridges.push(q); reserved.add(q.id); }
    }
  }
  return { root, target, path, practice, bridges, fast };
}

/** Next unseen Boss Fight variant for the target. */
export function nextBoss(learner: Learner, target: SkillId): Question | undefined {
  return pickUnseen(learner, target, ["boss"]);
}
