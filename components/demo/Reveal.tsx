"use client";

import clsx from "clsx";
import { ArrowDown, ChevronDown, CircleHelp } from "lucide-react";
import { useState } from "react";
import { skillById, TARGET_SKILL } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import type { EvidenceRowView as EvidenceRow } from "@/lib/live/types";
import { TARGET_SCOPE } from "@/lib/scope";
import { lc } from "@/lib/text";
import type { Edge } from "../KnowledgeMap";
import { MapStage } from "../MapStage";
import { StatusChip } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

export function Reveal({ view, act, busy, mode }: StageProps) {
  const state = view;
  const status = view.status;
  const [why, setWhy] = useState(false);
  const diagnosis = state.diagnosis!;
  const root = diagnosis.rootGaps[0];
  const target = skillById[TARGET_SKILL];

  if (!root || !view.reveal) return <Uncertain act={act} status={status} unresolved={diagnosis.unresolved} mode={mode} />;

  const { chain, rows: chainRows, others } = view.reveal;
  const chainEdges: Edge[] = chain.slice(0, -1).map((id, i) => [chain[i + 1], id] as Edge);
  const tested = state.probes.length;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <section aria-label="Root gap on your Knowledge Map" className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative mx-auto max-w-md lg:max-w-none">
          <div aria-hidden className="absolute top-[58%] left-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-root/15 blur-3xl" />
          <MapStage
            status={status}
            scope={TARGET_SCOPE}
            traced={chainEdges}
            pulse={root}
            focus={root}
            label={`Knowledge Map: root gap at ${skillById[root].name}`}
            className="map-fit relative"
          />
        </div>
      </section>

      <section className="px-4 sm:px-0" aria-labelledby="reveal-h">
        <p className="anim-rise text-base font-semibold text-root">Root gap confirmed</p>
        <h1 id="reveal-h" className="anim-rise mt-2 font-display text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl" style={{ animationDelay: "80ms" }}>
          You&apos;re not bad at {lc(target.short)}.
        </h1>
        <p className="anim-rise mt-4 text-xl text-balance text-text" style={{ animationDelay: "200ms" }}>
          You&apos;re shaky on <strong className="text-root">{lc(skillById[root].name)}</strong>, and it&apos;s holding up
          everything above it.
        </p>

        <ol className="anim-rise mt-8 grid gap-0" style={{ animationDelay: "320ms" }}>
          <Beat label="What you were trying to learn" value={target.name} />
          <Beat label="What Patch traced" value={`${chain.length} linked skills, ${tested} questions, every step confirmed twice`} />
          <Beat label="Where the problem starts" value={skillById[root].name} root last />
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => act({ type: "beginMission" })} loading={busy} className="sm:px-8">
            Start my Root Gap Mission
          </Button>
          <Button variant="ghost" size="lg" onClick={() => act({ type: "dispute" })} disabled={busy}>
            That doesn&apos;t sound right
          </Button>
        </div>
        {state.disputes.length > 0 && (
          <p className="mt-3 text-sm text-muted">You disputed this once. Patch re-checked it with new questions it hadn&apos;t used before.</p>
        )}

        <div className="mt-8 rounded-panel border border-line bg-ink-900/70">
          <button
            type="button"
            aria-expanded={why}
            aria-controls="why-panel"
            onClick={() => setWhy((w) => !w)}
            className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-panel px-5 text-left text-lg font-bold"
          >
            <span className="flex items-center gap-2">
              <CircleHelp aria-hidden className="size-5 text-beam" /> Why Patch thinks this
            </span>
            <ChevronDown aria-hidden className={clsx("size-5 text-muted transition-transform duration-[var(--dur-base)]", why && "rotate-180")} />
          </button>
          {why && (
            <div id="why-panel" className="anim-rise border-t border-line px-5 py-5">
              <p className="text-sm text-muted">Main branch, from what you missed down to where it starts:</p>
              <ol className="mt-3">
                {chainRows.map((row, i) => (
                  <li key={row.skill}>
                    {i === chain.length && <p className="mt-4 mb-2 text-sm text-muted">The foundation underneath:</p>}
                    <Row row={row} />
                    {i < chain.length - 1 && <ArrowDown aria-hidden className="my-1 ml-2 size-4 text-faint" />}
                  </li>
                ))}
              </ol>
              {others.length > 0 && (
                <>
                  <p className="mt-6 text-sm text-muted">Other branches Patch checked and ruled out:</p>
                  <ul className="mt-2">
                    {others.map((row) => <li key={row.skill}><Row row={row} /></li>)}
                  </ul>
                </>
              )}
              <p className="mt-5 text-sm text-faint">
                Solid with a solid outline means tested directly. A dashed outline means inferred from a harder skill you got
                right, not directly tested.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Beat({ label, value, root, last }: { label: string; value: string; root?: boolean; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[1.25rem_1fr] gap-x-4 pb-5">
      <span aria-hidden className="relative flex justify-center">
        <span className={clsx("mt-1.5 size-3 rounded-full", root ? "bg-root shadow-[var(--glow-root)]" : "bg-beam")} />
        {!last && <span className="absolute top-5 bottom-[-0.25rem] w-px bg-line-strong" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-faint">{label}</p>
        <p className={clsx("mt-0.5 text-lg font-semibold", root ? "text-root" : "text-text")}>{value}</p>
      </div>
    </li>
  );
}

function Row({ row }: { row: EvidenceRow }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-card bg-ink-800/60 px-3 py-2">
      <div className="min-w-0">
        <p className="font-semibold text-text">
          <span className="mr-2 text-sm text-faint">{row.skill}</span>
          {row.name}
        </p>
        <p className="text-sm text-muted">{row.detail}</p>
      </div>
      <StatusChip status={row.status} label={row.status === "inferred_known" ? "Solid (inferred)" : undefined} />
    </div>
  );
}

function Uncertain({ act, status, unresolved, mode }: Pick<StageProps, "act" | "mode"> & { status: StageProps["view"]["status"]; unresolved: SkillId[] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-balance">Patch couldn&apos;t pin this one down.</h1>
      <p className="mt-4 text-lg text-muted">
        The answers pointed in different directions{unresolved.length ? `, and there are no fresh questions left for ${unresolved.map((u) => lc(skillById[u].name)).join(" and ")}` : ""}.
        Rather than guess, Patch flags this for your teacher.
      </p>
      <p className="mt-4 rounded-card border border-suspect/40 bg-suspect/[0.07] px-4 py-3 font-semibold text-suspect">Ask your teacher. They&apos;ll see this in their class view.</p>
      <div className="mx-auto mt-8 max-w-md">
        <MapStage status={status} scope={TARGET_SCOPE} label="Knowledge Map after an uncertain diagnosis" />
      </div>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => act({ type: "goto", stage: "map" })}>Open my Knowledge Map</Button>
        {mode === "demo" && <Button variant="secondary" onClick={() => act({ type: "reset" })}>Reset demo</Button>}
      </div>
    </div>
  );
}
