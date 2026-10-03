import { misconceptions } from "./misconceptions";
import { questions, questionsForSkill } from "./questions";
import { skills } from "./skills";

export * from "./types";
export * from "./skills";
export * from "./questions";
export * from "./misconceptions";
export * from "./math";

/**
 * Validate the content module: no missing prerequisites, no cycles, every
 * skill has a diagnostic, at least two checks and a bridge, every wrong option
 * carries a known misconception id. Returns a list of problems (empty = valid).
 */
export function validateContent(): string[] {
  const problems: string[] = [];
  const ids = new Set(skills.map((s) => s.id));

  for (const s of skills) {
    for (const p of s.prereqs) if (!ids.has(p)) problems.push(`${s.id}: missing prerequisite ${p}`);
  }

  // Cycle check (DFS colouring).
  const state = new Map<string, 0 | 1 | 2>();
  const byId = new Map(skills.map((s) => [s.id, s]));
  const visit = (id: string, path: string[]) => {
    const st = state.get(id) ?? 0;
    if (st === 1) { problems.push(`cycle: ${[...path, id].join(" -> ")}`); return; }
    if (st === 2) return;
    state.set(id, 1);
    for (const p of byId.get(id as never)?.prereqs ?? []) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const s of skills) visit(s.id, []);

  for (const s of skills) {
    const qs = questionsForSkill(s.id);
    if (!qs.some((q) => q.kind === "diagnostic")) problems.push(`${s.id}: no diagnostic question`);
    if (qs.filter((q) => q.kind === "check").length < 2) problems.push(`${s.id}: fewer than two check questions`);
    if (!qs.some((q) => q.kind === "bridge" || q.kind === "boss")) problems.push(`${s.id}: no bridge question`);
  }

  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) problems.push(`duplicate question id ${q.id}`);
    seen.add(q.id);
    if (q.options.length !== 4) problems.push(`${q.id}: needs four options`);
    if (q.options.filter((o) => o.correct).length !== 1) problems.push(`${q.id}: needs exactly one correct option`);
    for (const o of q.options) {
      if (!o.correct && (!o.misconceptionId || !misconceptions[o.misconceptionId])) {
        problems.push(`${q.id}: wrong option "${o.text}" has no known misconception`);
      }
    }
  }
  return problems;
}
