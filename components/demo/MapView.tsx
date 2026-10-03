"use client";

import { useState } from "react";
import type { SkillId } from "@/lib/content/types";
import { useCourse, useFmt } from "../CourseContext";
import { MapStage } from "../MapStage";
import { Legend, StatusChip } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

export function MapView({ view, act, mode }: StageProps) {
  const course = useCourse();
  const fmt = useFmt();
  const [selected, setSelected] = useState<SkillId>(view.mission?.root ?? course.target);
  const skill = course.skillById[selected];
  const row = view.evidence[selected] ?? { detail: "Not tested", answers: [] };
  const builds = course.graph.prereqs[selected].map((p) => course.skillById[p].short);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:py-10">
      <section aria-labelledby="map-h">
        <h1 id="map-h" className="font-display text-3xl font-bold sm:text-4xl">Your Knowledge Map</h1>
        <Legend className="mt-4" />
        <MapStage
          status={view.status}
          selected={selected}
          onSelect={setSelected}
          label="Your Knowledge Map. Each skill is a button showing its status."
          className="map-fit mt-4 max-w-xl lg:max-w-none"
        />
      </section>

      <aside aria-labelledby="inspect-h" aria-live="polite" className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-panel border border-line bg-ink-900/80 p-5 shadow-[var(--shadow-panel)] sm:p-6">
          <h2 id="inspect-h" className="text-2xl font-bold text-balance">{skill.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusChip status={view.status[selected]} label={view.status[selected] === "inferred_known" ? "Solid (inferred)" : undefined} />
            <span className="text-sm text-muted">{row.detail}</span>
          </div>

          {row.answers.length > 0 && (
            <ul className="mt-5 grid gap-2" aria-label="Answers on this skill">
              {row.answers.map((a, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 rounded-card bg-ink-800/70 px-3 py-2">
                  <span className="math line-clamp-2 min-w-0 text-sm">{fmt(a.text)}</span>
                  <span className={a.correct ? "shrink-0 text-sm font-semibold text-solid" : "shrink-0 text-sm font-semibold text-gap"}>
                    {a.correct ? "Right" : "Wrong"}
                    {a.disputed ? " (disputed)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 text-sm text-muted">{builds.length ? `Builds on: ${builds.join(", ")}` : "Foundation skill"}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          {mode === "demo" && <Button onClick={() => act({ type: "goto", stage: "teacher" })}>See the teacher view</Button>}
          {view.result && <Button variant="secondary" onClick={() => act({ type: "goto", stage: "victory" })}>Back to my result</Button>}
        </div>
      </aside>
    </div>
  );
}
