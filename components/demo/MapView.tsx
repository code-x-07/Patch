"use client";

import { useState } from "react";
import { formatMath } from "@/lib/content/math";
import { questionById } from "@/lib/content/questions";
import { skillById, TARGET_SKILL } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import { evidenceFor } from "@/lib/demo/view";
import { graph } from "@/lib/engine";
import { MapStage } from "../MapStage";
import { Legend, StatusChip } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

export function MapView({ state, dispatch, derived, status }: StageProps) {
  const [selected, setSelected] = useState<SkillId>(state.mission?.plan.root ?? TARGET_SKILL);
  const skill = skillById[selected];
  const row = evidenceFor(state.learner, selected, derived);
  const attempts = state.learner.attempts.filter((a) => a.skillId === selected);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:py-10">
      <section aria-labelledby="map-h">
        <h1 id="map-h" className="font-display text-3xl font-bold sm:text-4xl">Your Knowledge Map</h1>
        <p className="mt-2 text-base text-muted">Tap a skill to see the evidence behind it.</p>
        <Legend className="mt-4" />
        <MapStage
          status={status}
          selected={selected}
          onSelect={setSelected}
          label="Your Knowledge Map. Each skill is a button showing its status."
          className="map-fit mt-4 max-w-xl lg:max-w-none"
        />
      </section>

      <aside aria-labelledby="inspect-h" aria-live="polite" className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-panel border border-line bg-ink-900/80 p-5 shadow-[var(--shadow-panel)] sm:p-6">
          <p className="text-sm font-semibold text-faint">{skill.id}</p>
          <h2 id="inspect-h" className="mt-1 text-2xl font-bold text-balance">{skill.name}</h2>
          <p className="mt-1 text-base text-muted">{formatMath(skill.description)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusChip status={status[selected]} label={status[selected] === "inferred_known" ? "Solid (inferred)" : undefined} />
            <span className="text-sm text-muted">{row.detail}</span>
          </div>

          {attempts.length > 0 && (
            <ul className="mt-5 grid gap-2" aria-label="Answers on this skill">
              {attempts.map((a) => (
                <li key={a.seq} className="flex flex-wrap items-baseline justify-between gap-2 rounded-card bg-ink-800/70 px-3 py-2">
                  <span className="math">{formatMath(questionById[a.questionId].text)}</span>
                  <span className={a.correct ? "text-sm font-semibold text-solid" : "text-sm font-semibold text-gap"}>
                    {a.correct ? "Right" : "Wrong"}, {a.confidence}
                    {a.disputed ? " (disputed)" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 text-sm text-muted">
            {graph.prereqs[selected].length > 0 ? (
              <p>
                Builds on: {graph.prereqs[selected].map((p) => skillById[p].name).join(", ")}
              </p>
            ) : (
              <p>A foundation skill. Nothing comes before it.</p>
            )}
            {graph.dependents[selected].length > 0 && (
              <p className="mt-1">Unlocks: {graph.dependents[selected].map((p) => skillById[p].name).join(", ")}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <Button onClick={() => dispatch({ type: "goto", stage: "teacher" })}>See the teacher view</Button>
          {state.result && <Button variant="secondary" onClick={() => dispatch({ type: "goto", stage: "victory" })}>Back to my result</Button>}
        </div>
      </aside>
    </div>
  );
}
