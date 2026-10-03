"use client";

import clsx from "clsx";
import { memo, useMemo, type KeyboardEvent } from "react";
import { labelLines } from "@/lib/content/layout";
import type { SkillId } from "@/lib/content/types";
import type { CourseInfo } from "@/lib/course";
import { useCourse } from "./CourseContext";
import type { Status } from "@/lib/engine/types";
import { STATUS } from "./status";

export type Edge = [from: SkillId, to: SkillId];

export type MapProps = {
  status: Record<SkillId, Status>;
  /** Skills shown at full strength; everything else is dimmed. */
  scope?: ReadonlySet<SkillId> | null;
  /** Focused node: ring + its local prerequisite edges brightened. */
  focus?: SkillId | null;
  /** Edges lit by the trace beam, in the order they were traced. */
  traced?: Edge[];
  /** The edge drawing right now (animated). */
  active?: Edge | null;
  /** Edges of the repair path, coloured by the status of the skill they unlock. */
  repair?: Edge[];
  /** Pulsing Root Gap reveal. */
  pulse?: SkillId | null;
  /** Teacher heat: share of the class weak at each skill (0..1). */
  heat?: Partial<Record<SkillId, number>>;
  selected?: SkillId | null;
  onSelect?: (id: SkillId) => void;
  label: string;
  className?: string;
  /** Hide node labels (tiny hero preview). */
  bare?: boolean;
};

const R = 15;
const key = (e: Edge) => `${e[0]}-${e[1]}`;

function edgePath(layout: CourseInfo["layout"], from: SkillId, to: SkillId) {
  const a = layout[from];
  const b = layout[to];
  const y1 = a.y - R;
  const y2 = b.y + R + 2;
  const dy = (y1 - y2) / 2;
  // An edge must never look like it passes through another skill: if any node
  // sits near the straight line, bow the curve out to the side away from it.
  let bow = 0;
  for (const [id, p] of Object.entries(layout)) {
    if (id === from || id === to || p.y >= a.y - 4 || p.y <= b.y + 4) continue;
    const t = (a.y - p.y) / (a.y - b.y);
    const lineX = a.x + (b.x - a.x) * t;
    if (Math.abs(lineX - p.x) < R + 16) {
      const side = lineX < p.x ? -1 : lineX > p.x ? 1 : a.x >= b.x ? 1 : -1;
      bow = side * Math.max(Math.abs(bow), R + 34 - Math.abs(lineX - p.x));
    }
  }
  if (bow) {
    const k = bow * 1.6;
    return `M${a.x} ${y1} C${a.x + k} ${y1 - dy} ${b.x + k} ${y2 + dy} ${b.x} ${y2}`;
  }
  return `M${a.x} ${y1} C${a.x} ${y1 - dy} ${b.x} ${y2 + dy} ${b.x} ${y2}`;
}

function KnowledgeMapImpl({
  status, scope, focus, traced = [], active, repair = [], pulse, heat, selected, onSelect, label, className, bare,
}: MapProps) {
  const course = useCourse();
  const { skills, skillById, layout, width: MAP_W, height: MAP_H } = course;
  const ALL_EDGES = useMemo(() => skills.flatMap((s) => s.prereqs.map((p) => [p, s.id] as Edge)), [skills]);
  const tracedSet = new Set(traced.map(key));
  const repairSet = new Map(repair.map((e) => [key(e), e]));
  const local = new Set<string>();
  const near = new Set<SkillId>();
  const lens = selected ?? focus;
  if (lens) {
    near.add(lens);
    for (const p of skillById[lens].prereqs) { local.add(key([p, lens])); near.add(p); }
    for (const s of skills) if (s.prereqs.includes(lens)) { local.add(key([lens, s.id])); near.add(s.id); }
  }
  const inScope = (id: SkillId) => !scope || scope.has(id);
  const interactive = !!onSelect;

  const onKey = (id: SkillId) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(id); }
  };

  return (
    <div className={clsx("relative", className)} style={{ ["--map-aspect" as string]: MAP_H / MAP_W }}>
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="block h-full w-full select-none"
        role="group"
        aria-label={label}
      >
        <defs>
          <radialGradient id="node-core" cx="50%" cy="35%" r="70%">
            <stop offset="0%" style={{ stopColor: "var(--node-core-hi)" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-ink-900)" }} />
          </radialGradient>
        </defs>

        {/* Edges */}
        <g fill="none" strokeLinecap="round">
          {ALL_EDGES.map((e) => {
            const k = key(e);
            const isTraced = tracedSet.has(k);
            const rep = repairSet.get(k);
            const isLocal = local.has(k);
            const dim = !inScope(e[0]) || !inScope(e[1]);
            const d = edgePath(layout, e[0], e[1]);
            const repColor = rep ? STATUS[status[e[1]]].color : undefined;
            return (
              <g key={k} style={{ opacity: dim ? 0.12 : 1, transition: "opacity var(--dur-slow) var(--ease-in-out)" }}>
                <path d={d} style={{ stroke: "var(--color-line-strong)" }} strokeWidth={1.4} opacity={isLocal ? 1 : 0.6} />
                {isLocal && !isTraced && !rep && <path d={d} style={{ stroke: "var(--color-muted)" }} strokeWidth={1.6} opacity={0.7} />}
                {rep && (
                  <>
                    <path d={d} style={{ stroke: repColor }} strokeWidth={7} opacity={0.14} />
                    <path d={d} strokeWidth={2.4} style={{ stroke: repColor, transition: "stroke var(--dur-slow)" }} />
                  </>
                )}
                {isTraced && !rep && (
                  <>
                    <path d={d} style={{ stroke: "var(--color-beam)" }} strokeWidth={8} opacity={0.12} />
                    <path
                      d={d}
                      strokeWidth={2.2}
                      pathLength={1}
                      strokeDasharray="1"
                      strokeDashoffset={0}
                      style={{
                        stroke: "var(--color-beam)",
                        ...(active && key(active) === k ? { animation: "draw var(--dur-hop) var(--ease-out) both", ["--len" as string]: 1 } : {}),
                      }}
                    />
                    <path
                      className="motion-decor"
                      d={d}
                      strokeWidth={2.2}
                      strokeDasharray="3 21"
                      style={{ stroke: "var(--color-beam-strong)", animation: "edge-flow 1.4s linear infinite" }}
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        {skills.map((s) => {
          const { x, y } = layout[s.id];
          const st = status[s.id];
          const meta = STATUS[st];
          const Icon = meta.icon;
          const dim = !inScope(s.id) || (lens != null && !near.has(s.id) && !!selected);
          const isFocus = focus === s.id || selected === s.id;
          const h = heat?.[s.id];
          const lines = labelLines(s.short);
          const dashed = st === "unknown" || st === "inferred_known";
          const filled = st !== "unknown";
          return (
            <g
              key={s.id}
              transform={`translate(${x} ${y})`}
              style={{ opacity: dim ? 0.3 : 1, transition: "opacity var(--dur-slow) var(--ease-in-out)" }}
              {...(interactive
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `${s.name}: ${meta.label}${st === "inferred_known" ? " (inferred)" : ""}`,
                    "aria-pressed": selected === s.id,
                    onClick: () => onSelect?.(s.id),
                    onKeyDown: onKey(s.id),
                    className: "cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100",
                  }
                : { "aria-hidden": true })}
            >
              {interactive && <circle r={24} fill="transparent" />}
              {h != null && h > 0 && (
                <circle r={R + 4 + h * 13} style={{ fill: "var(--color-gap)" }} opacity={0.08 + h * 0.22} />
              )}
              {pulse === s.id && (
                <>
                  <circle r={R + 2} fill="none" strokeWidth={2} className="motion-decor" style={{ stroke: "var(--color-root)", transformBox: "fill-box", transformOrigin: "center", animation: "pulse-root 1.8s var(--ease-out) infinite" }} />
                  <circle r={R + 9} fill="none" style={{ stroke: "var(--color-root)" }} strokeWidth={1.2} opacity={0.6} />
                </>
              )}
              <circle
                className="focus-ring"
                r={R + 7}
                fill="none"
                strokeWidth={2}
                opacity={isFocus ? 1 : 0}
                style={{ stroke: "var(--color-beam-strong)", transition: "opacity var(--dur-base)" }}
              />
              <circle
                r={R}
                strokeWidth={st === "root_gap" ? 2.8 : 2}
                strokeDasharray={dashed ? (st === "inferred_known" ? "5 3" : "3 4") : undefined}
                style={{
                  fill: filled ? `color-mix(in oklab, ${meta.color} 16%, var(--color-ink-900))` : "url(#node-core)",
                  stroke: meta.color,
                  transition: "fill var(--dur-slow) var(--ease-in-out), stroke var(--dur-slow) var(--ease-in-out)",
                }}
              />
              <Icon x={-8} y={-8} width={16} height={16} style={{ color: meta.color }} strokeWidth={2.6} aria-hidden />
              {!bare && (
                <text
                  y={R + 15}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={isFocus ? 700 : 600}
                  style={{ fill: dim ? "var(--color-faint)" : "var(--color-text)", stroke: "var(--color-ink-950)" }}
                  strokeWidth={4}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x={0} dy={i === 0 ? 0 : 14}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Text alternative for screen readers */}
      <ul className="sr-only">
        {skills.map((s) => (
          <li key={s.id}>
            {s.name}: {STATUS[status[s.id]].label}
            {status[s.id] === "inferred_known" ? " (inferred, not directly tested)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const KnowledgeMap = memo(KnowledgeMapImpl);
