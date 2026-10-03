"use client";

import { useState } from "react";
import { buildGraph } from "@/lib/engine/graph";
import type { SkillId } from "@/lib/content/types";
import type { Status } from "@/lib/engine/types";
import { toSkills, type Course } from "@/lib/learning/schema";
import { STATUS, StatusChip } from "../status";

export function LearningMap({ course, status, focus }: { course: Course; status?: Partial<Record<SkillId, Status>>; focus?: SkillId | null }) {
  const [selected, setSelected] = useState<SkillId | null>(null);
  const graph = buildGraph(toSkills(course));
  const levels = Math.max(...Object.values(graph.depth)) + 1;
  const height = levels * 150 + 30;
  const positions = Object.fromEntries(course.skills.map((skill) => {
    const peers = course.skills.filter((s) => graph.depth[s.id] === graph.depth[skill.id]);
    return [skill.id, { x: ((peers.findIndex((s) => s.id === skill.id) + 0.5) / peers.length) * 600, y: (levels - 1 - graph.depth[skill.id]) * 150 + 70 }];
  })) as Record<SkillId, { x: number; y: number }>;
  const selectedSkill = course.skills.find((s) => s.id === selected);
  return (
    <section aria-label="Generated Knowledge Map" className="min-w-0">
      <p className="text-sm font-semibold text-faint">Knowledge Map · {course.skills.length} connected skills</p>
      <div className="relative mt-4 rounded-panel border border-line bg-ink-900/50" style={{ height }}>
        <svg aria-hidden viewBox={`0 0 600 ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {course.skills.flatMap((s) => s.prerequisites.map((p) => (
            <line key={`${s.id}-${p.skillId}`} x1={positions[s.id].x} y1={positions[s.id].y} x2={positions[p.skillId].x} y2={positions[p.skillId].y} stroke="var(--color-line-strong)" strokeWidth="2" strokeDasharray={p.origin === "inferred" ? "5 5" : undefined} />
          )))}
        </svg>
        {course.skills.map((skill) => {
          const position = positions[skill.id];
          const st = status?.[skill.id] ?? "unknown";
          const meta = STATUS[st];
          const Icon = meta.icon;
          const peers = course.skills.filter((s) => graph.depth[s.id] === graph.depth[skill.id]).length;
          return (
            <button key={skill.id} onClick={() => setSelected(skill.id)} aria-pressed={selected === skill.id} aria-label={`${skill.name}: ${meta.label}${st === "inferred_known" ? ", inferred" : ""}${skill.id === course.targetSkillId ? ", target" : ""}`}
              className="absolute flex h-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 bg-ink-950 px-1 py-2 text-center shadow-[var(--shadow-panel)] hover:bg-ink-800"
              style={{ left: `${position.x / 6}%`, top: position.y, width: `${Math.min(39, 85 / peers)}%`, borderColor: selected === skill.id || focus === skill.id ? "var(--color-beam)" : meta.color }}>
              <Icon aria-hidden className="size-5" style={{ color: meta.color }} />
              <span className="line-clamp-3 text-xs font-bold break-words sm:text-sm">{skill.short}</span>
              <span className="text-xs" style={{ color: meta.color }}>{meta.label}{st === "inferred_known" ? " (inferred)" : ""}</span>
              {skill.id === course.targetSkillId && <span className="text-xs font-semibold text-beam">Target</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-faint">Earlier foundations sit below the target. Dashed links are AI-proposed dependencies. Select any skill to inspect it.</p>
      {selectedSkill && <div className="mt-4 rounded-card border border-line bg-ink-900 p-4" role="region" aria-label="Selected skill details">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{selectedSkill.name}</h3><StatusChip status={status?.[selectedSkill.id] ?? "unknown"} /></div>
        <p className="mt-2 text-muted">{selectedSkill.description}</p>
        <p className="mt-3 text-sm text-beam">{selectedSkill.source.origin === "inferred" ? "AI-proposed foundation" : "From your notes"} · {selectedSkill.source.reference}</p>
        <p className="mt-1 text-sm text-muted">{selectedSkill.source.excerpt}</p>
        {selectedSkill.prerequisites.length > 0 && <ul className="mt-3 grid gap-2 text-sm text-muted">{selectedSkill.prerequisites.map((p) => <li key={p.skillId}><strong className="text-text">Needs {course.skills.find((s) => s.id === p.skillId)?.name}: </strong>{p.reason} ({p.origin === "inferred" ? "AI-proposed link" : "from notes"})</li>)}</ul>}
      </div>}
    </section>
  );
}
