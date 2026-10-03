"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "../useReducedMotion";
import { skillById } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import { lc, TARGET_SCOPE } from "@/lib/demo/view";
import type { Edge } from "../KnowledgeMap";
import { MapStage } from "../MapStage";
import { StatusChip } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

/** ROOT GAP DEFEATED → path repairs → TRANSFER VERIFIED, each beat driven by real evidence. */
export function Victory({ state, dispatch, derived, status }: StageProps) {
  const reduced = useReducedMotion();
  const [timedBeat, setBeat] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [setTimeout(() => setBeat(1), 250), setTimeout(() => setBeat(2), 1100), setTimeout(() => setBeat(3), 2100)];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);
  const beat = reduced ? 3 : timedBeat;

  const result = state.result!;
  const plan = state.mission?.plan;
  const path: SkillId[] = plan?.path ?? [];
  const repairEdges: Edge[] = beat >= 2 ? path.slice(0, -1).map((id, i) => [id, path[i + 1]] as Edge) : [];
  // Before the path "repairs", show the diagnosed state; after, the real current state.
  const shownStatus = beat >= 2 ? status : { ...status, ...(plan ? { [plan.root]: "root_gap" as const } : {}) };

  const rising = (id: SkillId) => derived.direct[id].status === "suspect" && derived.direct[id].passQs.length > 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:py-12">
      <section className="order-2 lg:order-1" aria-label="Your repaired path on the Knowledge Map">
        <div className="mx-auto max-w-md lg:sticky lg:top-20 lg:max-w-none">
          <MapStage status={shownStatus} scope={TARGET_SCOPE} repair={repairEdges} focus={plan?.target} label="Knowledge Map after the mission" className="map-fit" />
        </div>
      </section>

      <section className="order-1 lg:order-2" aria-live="polite">
        {result.needsTeacher ? (
          <>
            <h1 className="font-display text-4xl font-bold">Not this time, and that&apos;s useful.</h1>
            <p className="mt-4 text-lg text-muted">
              The Boss Fight slipped twice. Your teacher has been flagged so they can help with {lc(skillById[plan!.target].name)} in person.
            </p>
            <p className="mt-5 rounded-card border border-suspect/40 bg-suspect/[0.07] px-4 py-3 text-lg font-semibold text-suspect">Ask your teacher</p>
          </>
        ) : (
          <>
            {/* Every beat is laid out from the start and only revealed, so nothing shifts. */}
            {result.rootDefeated && (
              <Reveal on={beat >= 1} anim="anim-stamp">
                <p className="font-display text-4xl font-extrabold tracking-[0.08em] text-solid sm:text-5xl" style={{ textShadow: "var(--text-glow-solid)" }}>
                  ROOT GAP DEFEATED
                </p>
              </Reveal>
            )}
            {plan && (
              <Reveal on={beat >= 2}>
                <ul className="mt-6 grid gap-2" aria-label="Repair path">
                  {path.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-3 rounded-card bg-ink-900/70 px-4 py-2.5">
                      <span className="font-semibold">{skillById[id].name}</span>
                      {rising(id) ? <StatusChip status="suspect" label="Rising" /> : <StatusChip status={status[id]} />}
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            {result.transferVerified && (
              <Reveal on={beat >= 3} anim="anim-stamp">
                <p className="mt-8 font-display text-3xl font-extrabold tracking-[0.08em] text-beam sm:text-4xl" style={{ textShadow: "var(--text-glow-beam)" }}>
                  TRANSFER VERIFIED
                </p>
              </Reveal>
            )}
            <Reveal on={beat >= 3}>
              <p className="mt-4 max-w-xl text-base text-muted">
                You solved new {lc(skillById[plan!.target].short)} questions on your own, sure each time. That proves the fix carried
                over today. The skills in between still need their own checks before they turn solid, and lasting memory needs a
                check on a later day.
              </p>
            </Reveal>
          </>
        )}
        <Reveal on={beat >= 3}>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => dispatch({ type: "goto", stage: "map" })}>Open my Knowledge Map</Button>
            <Button size="lg" variant="secondary" onClick={() => dispatch({ type: "goto", stage: "teacher" })}>See the teacher view</Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** Keeps its space while hidden (no layout shift); plays its entrance when shown. */
function Reveal({ on, anim = "anim-rise", children }: { on: boolean; anim?: string; children: React.ReactNode }) {
  return (
    <div className={on ? anim : "invisible"} aria-hidden={!on || undefined} inert={!on || undefined}>
      {children}
    </div>
  );
}
