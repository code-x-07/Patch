"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "../useReducedMotion";
import { skillById, TARGET_SKILL } from "@/lib/content/skills";
import { DEMO_STUDENT, scriptedAnswer } from "@/lib/demo/script";
import { estimateRemaining, lc, TARGET_SCOPE } from "@/lib/demo/view";
import type { Edge } from "../KnowledgeMap";
import { MapStage } from "../MapStage";
import { StatusChip } from "../status";
import { QuestionCard } from "./QuestionCard";
import type { StageProps } from "./types";

export function Trace({ state, dispatch, derived, status, follow }: StageProps) {
  const reduced = useReducedMotion();
  // Opening beat: focus the target and dim everything that can't explain it.
  const [openingBeat, setOpeningBeat] = useState(state.probes.length === 0);
  useEffect(() => {
    if (!openingBeat || reduced) return;
    const t = setTimeout(() => setOpeningBeat(false), 1500);
    return () => clearTimeout(t);
  }, [openingBeat, reduced]);
  const opening = openingBeat && !reduced;

  // Each new probe: bring the map back into view so the beam's arrival is seen.
  const qid = state.current?.question.id;
  useEffect(() => {
    if (qid) window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [qid, reduced]);

  const cur = state.current;
  const skill = cur ? skillById[cur.question.skillId] : null;
  const from = cur && !opening ? state.pendingFrom : null;
  // Edges already traced, plus the one the beam is travelling along to reach this question.
  const traced: Edge[] = state.probes.filter((p) => p.from).map((p) => [p.skill, p.from!] as Edge);
  const arriving: Edge | null = !state.feedback && skill && from ? [skill.id, from] : null;
  if (arriving && !traced.some((e) => e[0] === arriving[0] && e[1] === arriving[1])) traced.push(arriving);
  const focus = opening ? TARGET_SKILL : cur?.question.skillId ?? null;
  const n = state.probes.length + (state.feedback ? 0 : 1);
  const about = n + estimateRemaining(derived) - (state.feedback ? 0 : 1);

  const reasonText =
    !skill ? "" :
    state.pendingReason === "confirm"
      ? `One slip isn't proof. Checking ${lc(skill.name)} with a different question.`
      : state.pendingReason === "verify"
        ? `Checking the foundation underneath: ${lc(skill.name)}.`
        : from
          ? `${skill.name} comes before ${lc(skillById[from].name)}. Is the trouble here?`
          : `Testing ${lc(skill.name)}.`;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-0 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:py-8">
      <section aria-label="Trace on your Knowledge Map" className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative border-b border-line/60 bg-ink-950/60 lg:rounded-panel lg:border lg:bg-transparent lg:p-4">
          <MapStage
            status={status}
            scope={TARGET_SCOPE}
            focus={focus}
            traced={traced}
            active={arriving}
            camera={focus}
            zoom={1.35}
            height={320}
            label="Knowledge Map: tracing back from solving quadratics"
          />
          <p className="pointer-events-none absolute top-0 right-0 left-0 bg-gradient-to-b from-ink-950 via-ink-950/80 to-transparent px-4 pt-3 pb-6 text-sm font-semibold text-beam lg:top-4 lg:left-4 lg:bg-none lg:p-2" aria-live="polite">
            {opening ? `Following the trail back from ${lc(skillById[TARGET_SKILL].name)}…` : `Tracing · question ${n} of about ${Math.max(n, about)}`}
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-0" aria-labelledby="trace-h">
        <h1 id="trace-h" className="sr-only">Finding your root gap</h1>
        {opening || !cur ? (
          <div className="py-6 lg:py-16">
            <p className="font-display text-3xl font-bold text-balance">Your mistake has a trail. Let&apos;s follow it.</p>
            <p className="mt-3 text-lg text-muted">
              Patch only shows skills that could explain the miss. Each step asks one short question and lights up what it learns.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-base text-muted">{reasonText}</p>
            <QuestionCard
              key={cur.question.id}
              question={cur.question}
              feedback={state.feedback}
              scripted={follow ? scriptedAnswer(DEMO_STUDENT, cur.question, cur.phase) : null}
              heading={skill!.name}
              onAnswer={(optionIndex, confidence) => dispatch({ type: "answer", optionIndex, confidence })}
              onContinue={() => dispatch({ type: "continue" })}
              continueLabel="Keep tracing"
              compactFeedback
            />
            {state.feedback && (
              <p className="anim-rise mt-4 flex flex-wrap items-center gap-2 text-base text-muted">
                {skill!.name} is now <StatusChip status={status[skill!.id]} />
              </p>
            )}
          </>
        )}

        {state.probes.length > 0 && (
          <details className="mt-8 rounded-card border border-line bg-ink-900/60 px-4 py-3">
            <summary className="min-h-8 cursor-pointer text-base font-semibold text-muted">Evidence so far ({state.probes.length})</summary>
            <ol className="mt-3 grid gap-2">
              {state.probes.map((p, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-text">{skillById[p.skill].name}</span>
                  <span className={p.correct ? "font-semibold text-solid" : "font-semibold text-gap"}>{p.correct ? "Right" : "Wrong"}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>
    </div>
  );
}
