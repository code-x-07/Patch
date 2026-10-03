"use client";

import clsx from "clsx";
import { ArrowDown, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SkillId } from "@/lib/content/types";
import type { EvidenceRowView as EvidenceRow } from "@/lib/live/types";
import { useCourse } from "../CourseContext";
import type { Edge } from "../KnowledgeMap";
import { MapStage } from "../MapStage";
import { StatusChip } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

export function Reveal({ view, act, busy, mode }: StageProps) {
  const course = useCourse();
  const [why, setWhy] = useState(false);
  const diagnosis = view.diagnosis!;
  const root = diagnosis.rootGaps[0];
  const target = course.skillById[course.target];

  if (!root || !view.reveal) return <Uncertain act={act} status={view.status} unresolved={diagnosis.unresolved} mode={mode} />;

  const { chain, rows, others } = view.reveal;
  const chainEdges: Edge[] = chain.slice(0, -1).map((id, i) => [chain[i + 1], id] as Edge);
  const rootSkill = course.skillById[root];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <section aria-label="Root gap on your Knowledge Map" className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative mx-auto max-w-md lg:max-w-none">
          <div aria-hidden className="absolute top-[58%] left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-root/15 blur-3xl" />
          <MapStage
            status={view.status}
            scope={course.scope}
            traced={chainEdges}
            pulse={root}
            focus={root}
            label={`Knowledge Map: root gap at ${rootSkill.name}`}
            className="map-fit relative"
          />
        </div>
      </section>

      <section className="px-4 sm:px-0" aria-labelledby="reveal-h">
        <p className="anim-rise text-base font-semibold text-root">Root gap confirmed</p>
        <h1 id="reveal-h" className="anim-rise mt-2 font-display text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl" style={{ animationDelay: "80ms" }}>
          It starts at <span className="text-root">{rootSkill.short.toLowerCase()}</span>.
        </h1>

        <ol className="anim-rise mt-8 grid gap-0" style={{ animationDelay: "200ms" }}>
          <Beat label="You missed" value={target.name} />
          <Beat label="Traced" value={`${chain.length} skills · ${view.probes.length} questions`} />
          <Beat label="Root gap" value={rootSkill.name} root last />
        </ol>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => act({ type: "beginMission" })} loading={busy} className="sm:px-8">
            Start my Root Gap Mission
          </Button>
          <Button variant="ghost" size="lg" onClick={() => act({ type: "dispute" })} disabled={busy}>
            That doesn&apos;t sound right
          </Button>
        </div>
        {view.disputes.length > 0 && <p className="mt-3 text-sm text-muted">Re-checked with new questions.</p>}

        <div className="mt-8 rounded-panel border border-line bg-ink-900/70">
          <button
            type="button"
            aria-expanded={why}
            aria-controls="why-panel"
            onClick={() => setWhy((w) => !w)}
            className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-panel px-5 text-left text-base font-bold"
          >
            Why Patch thinks this
            <ChevronDown aria-hidden className={clsx("size-5 text-muted transition-transform duration-[var(--dur-base)]", why && "rotate-180")} />
          </button>
          {why && (
            <div id="why-panel" className="anim-rise border-t border-line px-5 py-5">
              <ol>
                {rows.map((row, i) => (
                  <li key={row.skill}>
                    {i === chain.length && <p className="mt-4 mb-2 text-sm text-faint">Underneath</p>}
                    <Row row={row} />
                    {i < chain.length - 1 && <ArrowDown aria-hidden className="my-1 ml-2 size-4 text-faint" />}
                  </li>
                ))}
              </ol>
              {others.length > 0 && (
                <>
                  <p className="mt-5 mb-2 text-sm text-faint">Ruled out</p>
                  <ul className="grid gap-1.5">
                    {others.map((row) => <li key={row.skill}><Row row={row} /></li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Beat({ label, value, root, last }: { label: string; value: string; root?: boolean; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[1.25rem_1fr] gap-x-4 pb-4">
      <span aria-hidden className="relative flex justify-center">
        <span className={clsx("mt-1.5 size-3 rounded-full", root ? "bg-root shadow-[var(--glow-root)]" : "bg-beam")} />
        {!last && <span className="absolute top-5 bottom-[-0.25rem] w-px bg-line-strong" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-faint">{label}</p>
        <p className={clsx("text-lg font-semibold", root ? "text-root" : "text-text")}>{value}</p>
      </div>
    </li>
  );
}

function Row({ row }: { row: EvidenceRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card bg-ink-800/60 px-3 py-2">
      <div className="min-w-0">
        <p className="font-semibold text-text">{row.name}</p>
        <p className="text-sm text-muted">{row.detail}</p>
      </div>
      <StatusChip status={row.status} label={row.status === "inferred_known" ? "Solid (inferred)" : undefined} />
    </div>
  );
}

function Uncertain({ act, status, unresolved, mode }: Pick<StageProps, "act" | "mode"> & { status: StageProps["view"]["status"]; unresolved: SkillId[] }) {
  const course = useCourse();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-balance">No clear root gap</h1>
      <p className="mt-3 text-lg text-muted">
        Your answers point in different directions{unresolved.length ? ` (${unresolved.map((u) => course.skillById[u].short).join(", ")})` : ""}.
      </p>
      <p className="mt-4 inline-block rounded-card border border-suspect/40 bg-suspect/[0.07] px-4 py-2 font-semibold text-suspect">Ask your teacher</p>
      <div className="mx-auto mt-8 max-w-md">
        <MapStage status={status} scope={course.scope} label="Knowledge Map after an uncertain diagnosis" />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => act({ type: "goto", stage: "map" })}>Open my Knowledge Map</Button>
        {mode === "demo" && <Button variant="secondary" onClick={() => act({ type: "reset" })}>Reset demo</Button>}
      </div>
    </div>
  );
}
