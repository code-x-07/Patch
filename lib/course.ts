import { layout as demoLayout, MAP_H, MAP_W } from "./content/layout";
import { OBJECTIVE_NAME, skills as demoSkills, TARGET_SKILL } from "./content/skills";
import type { Question, Skill, SkillId } from "./content/types";
import type { ContentBank } from "./engine/bank";
import { ancestors, buildGraph, byId, type Graph } from "./engine/graph";

/**
 * Everything a screen needs to draw a course: skills, target, map layout.
 * Client-safe: no questions or answer keys.
 */
export type CourseInfo = {
  /** Short name for headings, e.g. "Quadratic equations". */
  title: string;
  skills: Skill[];
  skillById: Record<SkillId, Skill>;
  target: SkillId;
  graph: Graph;
  /** The target and all its prerequisites. */
  scope: ReadonlySet<SkillId>;
  layout: Record<SkillId, { x: number; y: number }>;
  width: number;
  height: number;
  /** Text is shown as written (code, prose) instead of maths formatting. */
  conceptual: boolean;
};

/** A playable course: the info plus the quiz and question bank (engine side). */
export type CourseDef = CourseInfo & {
  quiz: Question[];
  bank: ContentBank;
  /** Keep check/bridge questions for the repair mission (diagnosis uses diagnostic questions only). */
  reserveRepair: boolean;
};

export function courseInfo(opts: {
  title: string;
  skills: Skill[];
  target: SkillId;
  layout?: Record<SkillId, { x: number; y: number }>;
  width?: number;
  height?: number;
  conceptual?: boolean;
}): CourseInfo {
  const graph = buildGraph(opts.skills);
  const auto = opts.layout ? null : autoLayout(graph, opts.target);
  return {
    title: opts.title,
    skills: opts.skills,
    skillById: Object.fromEntries(opts.skills.map((s) => [s.id, s])) as Record<SkillId, Skill>,
    target: opts.target,
    graph,
    scope: new Set<SkillId>([opts.target, ...ancestors(graph, opts.target)]),
    layout: opts.layout ?? auto!.layout,
    width: opts.width ?? auto?.width ?? MAP_W,
    height: opts.height ?? auto?.height ?? MAP_H,
    conceptual: opts.conceptual ?? false,
  };
}

/** The bundled algebra demo, with its hand-tuned layout. */
export const DEMO_INFO: CourseInfo = courseInfo({
  title: OBJECTIVE_NAME,
  skills: demoSkills,
  target: TARGET_SKILL,
  layout: demoLayout,
  width: MAP_W,
  height: MAP_H,
});

const COL_GAP = 92;
const ROW_GAP = 82;
const PAD_X = 46;
const PAD_Y = 42;

/**
 * Layered layout for any prerequisite graph: the target on top, each skill one
 * row below the deepest skill it unlocks, foundations at the bottom. Rows are
 * ordered by the average position of their neighbours to reduce crossings.
 * Crowded rows are staggered so labels never overlap.
 */
export function autoLayout(graph: Graph, target: SkillId) {
  // Row = longest distance down from the target, so every edge points upward.
  const row = new Map<SkillId, number>([[target, 0]]);
  const visit = (id: SkillId) => {
    for (const p of graph.prereqs[id]) {
      const r = row.get(id)! + 1;
      if ((row.get(p) ?? -1) < r) {
        row.set(p, r);
        visit(p);
      }
    }
  };
  visit(target);
  for (const id of graph.ids) if (!row.has(id)) row.set(id, Math.max(...row.values()) + 1);

  const rows: SkillId[][] = [];
  for (const [id, r] of row) (rows[r] ??= []).push(id);
  rows.forEach((r) => r.sort(byId));

  // Barycentre ordering: sweep down then up a few times.
  const pos = new Map<SkillId, number>();
  const place = () => rows.forEach((r) => r.forEach((id, i) => pos.set(id, (i + 0.5) / r.length)));
  place();
  const avg = (ids: SkillId[], fallback: number) => (ids.length ? ids.reduce((s, x) => s + (pos.get(x) ?? fallback), 0) / ids.length : fallback);
  for (let pass = 0; pass < 4; pass++) {
    for (let r = 1; r < rows.length; r++) rows[r].sort((a, b) => avg(graph.dependents[a], pos.get(a)!) - avg(graph.dependents[b], pos.get(b)!));
    place();
    for (let r = rows.length - 2; r >= 0; r--) rows[r].sort((a, b) => avg(graph.prereqs[a], pos.get(a)!) - avg(graph.prereqs[b], pos.get(b)!));
    place();
  }

  const widest = Math.max(...rows.map((r) => r.length));
  const width = Math.max(400, PAD_X * 2 + (widest - 1) * COL_GAP);
  const layout = {} as Record<SkillId, { x: number; y: number }>;
  let y = PAD_Y;
  rows.forEach((r) => {
    const span = (r.length - 1) * COL_GAP;
    const x0 = (width - span) / 2;
    // Rows wider than 4 stagger vertically so two-line labels have room.
    const stagger = r.length > 4 ? 26 : 0;
    r.forEach((id, i) => {
      layout[id] = { x: Math.round(x0 + i * COL_GAP), y: Math.round(y + (i % 2) * stagger) };
    });
    y += ROW_GAP + (r.length > 4 ? 26 : 0);
  });
  return { layout, width, height: y - ROW_GAP + PAD_Y + 30 };
}
