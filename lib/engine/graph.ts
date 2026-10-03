import type { Skill, SkillId } from "../content/types";

export type Graph = {
  ids: SkillId[];
  prereqs: Record<SkillId, SkillId[]>;
  dependents: Record<SkillId, SkillId[]>;
  /** Longest distance from a foundational skill (foundations are depth 0). */
  depth: Record<SkillId, number>;
};

export function buildGraph(skills: Skill[]): Graph {
  const ids = skills.map((s) => s.id);
  const prereqs = {} as Record<SkillId, SkillId[]>;
  const dependents = {} as Record<SkillId, SkillId[]>;
  for (const s of skills) {
    prereqs[s.id] = [...s.prereqs];
    dependents[s.id] = [];
  }
  for (const s of skills) for (const p of s.prereqs) {
    if (!dependents[p]) throw new Error(`${s.id}: missing prerequisite ${p}`);
    dependents[p].push(s.id);
  }
  assertAcyclic(ids, prereqs);
  const depth = {} as Record<SkillId, number>;
  const d = (id: SkillId): number =>
    (depth[id] ??= prereqs[id].length === 0 ? 0 : 1 + Math.max(...prereqs[id].map(d)));
  ids.forEach(d);
  return { ids, prereqs, dependents, depth };
}

export function assertAcyclic(ids: SkillId[], prereqs: Record<SkillId, SkillId[]>) {
  const state = new Map<SkillId, 1 | 2>();
  const visit = (id: SkillId, path: SkillId[]) => {
    if (state.get(id) === 1) throw new Error(`Skill graph has a cycle: ${[...path, id].join(" -> ")}`);
    if (state.get(id) === 2) return;
    state.set(id, 1);
    for (const p of prereqs[id] ?? []) visit(p, [...path, id]);
    state.set(id, 2);
  };
  ids.forEach((id) => visit(id, []));
}

function closure(start: SkillId, next: Record<SkillId, SkillId[]>): Set<SkillId> {
  const out = new Set<SkillId>();
  const stack = [...next[start]];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...next[id]);
  }
  return out;
}

export const ancestors = (g: Graph, id: SkillId) => closure(id, g.prereqs);
export const descendants = (g: Graph, id: SkillId) => closure(id, g.dependents);

/** Natural order for ids like S3 < S10. */
export const byId = (a: SkillId, b: SkillId) => Number(a.slice(1)) - Number(b.slice(1));

/**
 * Shortest path from `from` up to `to` following "unlocks" edges. Among several
 * shortest paths, prefer the one passing through the most skills that score
 * true for `weak` (suspect or gap); ties then break by skill id order.
 */
export function shortestPath(g: Graph, from: SkillId, to: SkillId, weak: (id: SkillId) => boolean): SkillId[] | null {
  const dist = new Map<SkillId, number>([[from, 0]]);
  const queue: SkillId[] = [from];
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of g.dependents[id]) if (!dist.has(n)) { dist.set(n, dist.get(id)! + 1); queue.push(n); }
  }
  if (!dist.has(to)) return null;
  // Best path ending at each node, built in BFS-distance order over shortest-path edges.
  const best = new Map<SkillId, { score: number; path: SkillId[] }>([[from, { score: weak(from) ? 1 : 0, path: [from] }]]);
  const order = [...dist.keys()].sort((a, b) => dist.get(a)! - dist.get(b)! || byId(a, b));
  for (const id of order) {
    const cur = best.get(id);
    if (!cur) continue;
    for (const n of g.dependents[id]) {
      if (dist.get(n) !== dist.get(id)! + 1) continue;
      const cand = { score: cur.score + (weak(n) ? 1 : 0), path: [...cur.path, n] };
      const prev = best.get(n);
      if (!prev || cand.score > prev.score || (cand.score === prev.score && comparePaths(cand.path, prev.path) < 0)) {
        best.set(n, cand);
      }
    }
  }
  return best.get(to)!.path;
}

function comparePaths(a: SkillId[], b: SkillId[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = byId(a[i], b[i]);
    if (c !== 0) return c;
  }
  return a.length - b.length;
}
