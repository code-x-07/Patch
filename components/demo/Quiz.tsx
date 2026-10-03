"use client";

import { OBJECTIVE_NAME } from "@/lib/content/skills";
import { DEMO_STUDENT, QUIZ, scriptedAnswer } from "@/lib/demo/script";
import { TARGET_SCOPE } from "@/lib/demo/view";
import { MapStage } from "../MapStage";
import { QuestionCard } from "./QuestionCard";
import type { StageProps } from "./types";

export function Quiz({ state, dispatch, status, follow }: StageProps) {
  const cur = state.current!;
  const n = state.quizIndex + 1;
  const scripted = follow ? scriptedAnswer(DEMO_STUDENT, cur.question, cur.phase) : null;
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:py-10">
      <aside className="order-2 hidden lg:order-1 lg:block" aria-label="Your Knowledge Map so far">
        <div className="sticky top-24">
          <p className="mb-2 text-sm font-semibold text-faint">Your map fills in as you answer</p>
          <MapStage status={status} scope={TARGET_SCOPE} focus={cur.question.skillId} label="Knowledge Map, updating with your answers" />
        </div>
      </aside>

      <section className="order-1 lg:order-2" aria-labelledby="quiz-title">
        <div className="flex items-center justify-between gap-4">
          <h1 id="quiz-title" className="font-display text-lg font-bold text-muted">
            Class Fight: {OBJECTIVE_NAME}
          </h1>
          <span className="text-sm font-semibold text-faint tabular-nums">
            {n} / {QUIZ.length}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-800" role="progressbar" aria-valuemin={0} aria-valuemax={QUIZ.length} aria-valuenow={n - 1} aria-label="Quiz progress">
          <div
            className="h-full rounded-full bg-beam transition-[width] duration-[var(--dur-slow)] ease-out"
            style={{ width: `${((n - (state.feedback ? 0 : 1)) / QUIZ.length) * 100}%` }}
          />
        </div>

        <div className="mt-8">
          <QuestionCard
            key={cur.question.id}
            question={cur.question}
            feedback={state.feedback}
            scripted={scripted}
            heading={`Question ${n} of ${QUIZ.length}`}
            onAnswer={(optionIndex, confidence) => dispatch({ type: "answer", optionIndex, confidence })}
            onContinue={() => dispatch({ type: "continue" })}
            continueLabel={n === QUIZ.length ? "See my Fight Report" : "Next question"}
          />
        </div>
        <p className="mt-6 text-sm text-faint">There&apos;s a timer in class, but speed never earns points here. Understanding does.</p>
      </section>
    </div>
  );
}
