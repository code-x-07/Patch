"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { useCourse } from "../CourseContext";
import { MapStage } from "../MapStage";
import { QuestionCard } from "./QuestionCard";
import { cardFeedback, cardQuestion, type StageProps } from "./types";

export function Quiz({ view, act, scripted, busy, mode }: StageProps) {
  const course = useCourse();
  const cur = view.current!;
  const n = view.quizIndex + 1;
  const total = view.quizTotal;
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:py-10">
      <aside className="order-2 hidden lg:order-1 lg:block" aria-label="Your Knowledge Map so far">
        <div className="sticky top-24">
                    <MapStage status={view.status} scope={course.scope} focus={cur.question.skillId} label="Knowledge Map, updating with your answers" className="map-fit" />
        </div>
      </aside>

      <section className="order-1 lg:order-2" aria-labelledby="quiz-title">
        <div className="flex items-center justify-between gap-4">
          <h1 id="quiz-title" className="font-display text-lg font-bold text-muted">
            {mode === "learn" ? "Fight" : "Class Fight"}: {course.title}
          </h1>
          <span className="flex items-center gap-3 text-sm font-semibold text-faint tabular-nums">
            <QuestionTimer key={cur.question.id} running={!view.feedback} />
            <span>{n} / {total}</span>
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n - 1} aria-label="Quiz progress">
          <div
            className="h-full rounded-full bg-beam transition-[width] duration-[var(--dur-slow)] ease-out"
            style={{ width: `${((n - (view.feedback ? 0 : 1)) / total) * 100}%` }}
          />
        </div>

        <div className="mt-8">
          <QuestionCard
            key={cur.question.id}
            question={cardQuestion(cur.question, course.conceptual)}
            feedback={cardFeedback(view.feedback)}
            scripted={scripted}
            busy={busy}
            heading={`Question ${n} of ${total}`}
            onAnswer={(optionIndex, confidence) => act({ type: "answer", optionIndex, confidence })}
            onContinue={() => act({ type: "continue" })}
            continueLabel={n === total ? "See my Fight Report" : "Next question"}
          />
        </div>
      </section>
    </div>
  );
}

/** Visible per-question timer. Shown for pace only: it never affects scoring. */
function QuestionTimer({ running }: { running: boolean }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  return (
    <span className="inline-flex items-center gap-1" role="timer" aria-label={`Time on this question: ${secs} seconds, not scored`}>
      <Timer aria-hidden className="size-4" />
      {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
      <span className="sr-only">(not scored)</span>
    </span>
  );
}
