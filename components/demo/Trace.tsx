"use client";

import { useEffect, useState } from "react";
import { lc } from "@/lib/text";
import { useCourse } from "../CourseContext";
import type { Edge } from "../KnowledgeMap";
import { MapStage } from "../MapStage";
import { StatusChip } from "../status";
import { useReducedMotion } from "../useReducedMotion";
import { QuestionCard } from "./QuestionCard";
import { cardFeedback, cardQuestion, type StageProps } from "./types";

export function Trace({ view, act, scripted, busy }: StageProps) {
  const course = useCourse();
  const reduced = useReducedMotion();
  // Opening beat: focus the target and dim everything that can't explain it.
  const [openingBeat, setOpeningBeat] = useState(view.probes.length === 0);
  useEffect(() => {
    if (!openingBeat || reduced) return;
    const t = setTimeout(() => setOpeningBeat(false), 1400);
    return () => clearTimeout(t);
  }, [openingBeat, reduced]);
  const opening = openingBeat && !reduced;

  // Each new probe: bring the map back into view so the beam's arrival is seen.
  const qid = view.current?.question.id;
  useEffect(() => {
    if (qid) window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [qid, reduced]);

  const cur = view.current;
  const skill = cur ? course.skillById[cur.question.skillId] : null;
  const from = cur && !opening ? view.pendingFrom : null;
  // Edges already traced, plus the one the beam is travelling along to reach this question.
  const traced: Edge[] = view.probes.filter((p) => p.from).map((p) => [p.skill, p.from!] as Edge);
  const arriving: Edge | null = !view.feedback && skill && from ? [skill.id, from] : null;
  if (arriving && !traced.some((e) => e[0] === arriving[0] && e[1] === arriving[1])) traced.push(arriving);
  const focus = opening ? course.target : cur?.question.skillId ?? null;
  const n = view.probes.length + (view.feedback ? 0 : 1);
  const about = Math.max(n, n + view.remaining - (view.feedback ? 0 : 1));

  const reason =
    !skill ? "" :
    view.pendingReason === "confirm" ? "Double-checking with a new question"
    : view.pendingReason === "verify" ? "Checking the foundation"
    : from ? `One step back from ${lc(course.skillById[from].short)}`
    : "Checking";

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-0 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:py-8">
      <section aria-label="Trace on your Knowledge Map" className="lg:sticky lg:top-20 lg:self-start">
        <div className="relative border-b border-line/60 bg-ink-950/60 lg:rounded-panel lg:border lg:bg-transparent lg:p-4">
          <MapStage
            status={view.status}
            scope={course.scope}
            focus={focus}
            traced={traced}
            active={arriving}
            camera={focus}
            zoom={1.35}
            height={320}
            label={`Knowledge Map: tracing back from ${course.skillById[course.target].name}`}
          />
          <p className="pointer-events-none absolute top-0 right-0 left-0 bg-gradient-to-b from-ink-950 via-ink-950/80 to-transparent px-4 pt-3 pb-6 text-sm font-semibold text-beam lg:top-4 lg:left-4 lg:bg-none lg:p-2" aria-live="polite">
            {opening ? "Tracing back…" : `Tracing · question ${n} of about ${about}`}
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-0" aria-labelledby="trace-h">
        <h1 id="trace-h" className="sr-only">Finding your root gap</h1>
        {opening || !cur ? (
          <p className="py-6 font-display text-3xl font-bold text-balance lg:py-16">Your mistake has a trail. Let&apos;s follow it.</p>
        ) : (
          <>
            <p className="mb-4 text-sm font-semibold text-beam">{reason}</p>
            <QuestionCard
              key={cur.question.id}
              question={cardQuestion(cur.question, course.conceptual)}
              feedback={cardFeedback(view.feedback)}
              scripted={scripted}
              busy={busy}
              heading={skill!.name}
              onAnswer={(optionIndex, confidence) => act({ type: "answer", optionIndex, confidence })}
              onContinue={() => act({ type: "continue" })}
              continueLabel="Keep tracing"
              compactFeedback
            />
            {view.feedback && (
              <p className="anim-rise mt-4 flex flex-wrap items-center gap-2 text-base text-muted">
                {skill!.short} <StatusChip status={view.status[skill!.id]} />
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
