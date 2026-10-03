"use client";

import clsx from "clsx";
import { ChevronDown, Crosshair } from "lucide-react";
import { useState } from "react";
import { formatMath } from "@/lib/content/math";
import { misconceptions } from "@/lib/content/misconceptions";
import { questionById } from "@/lib/content/questions";
import { OBJECTIVE_NAME, TARGET_SKILL, skillById } from "@/lib/content/skills";
import { scoreQuiz } from "@/lib/engine";
import { Button } from "../ui";
import type { StageProps } from "./types";

export function Report({ state, dispatch }: StageProps) {
  const [open, setOpen] = useState(false);
  const quiz = state.learner.attempts.filter((a) => a.phase === "quiz");
  const score = scoreQuiz(quiz);
  const mistakes = quiz.filter((a) => !a.correct);
  const guessed = quiz.filter((a) => a.confidence === "guess").length;
  const counts = new Map<string, number>();
  for (const a of mistakes) if (a.misconceptionId) counts.set(a.misconceptionId, (counts.get(a.misconceptionId) ?? 0) + 1);
  const recurring = [...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => misconceptions[id]);
  const confidentlyWrong = mistakes.filter((a) => a.confidence === "sure").length;
  const targetFailed = quiz.some((a) => a.skillId === TARGET_SKILL && !a.correct);
  const target = skillById[TARGET_SKILL];

  const stats: { value: string; label: string }[] = [
    { value: `${score.correct}/${score.total}`, label: "answered correctly" },
    { value: `${score.improvement >= 0 ? "+" : ""}${score.improvement}`, label: "improvement vs. expected" },
    { value: String(mistakes.length), label: mistakes.length === 1 ? "mistake" : "mistakes" },
    { value: String(guessed), label: guessed === 1 ? "answer was a guess" : "answers were guesses" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-14">
      <div className="anim-rise">
        <p className="text-sm font-semibold text-faint">Your Fight Report</p>
        <h1 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {OBJECTIVE_NAME}: <span className="tabular-nums">{score.percent}%</span>
        </h1>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="border-l-2 border-line-strong pl-4">
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{s.value}</dd>
              <dd className="mt-0.5 text-sm text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 max-w-2xl text-base text-muted">
          Improvement compares each answer with what your mastery predicted before the quiz, so it measures growth, not just
          the raw score. {confidentlyWrong > 0 && <>You were sure on {confidentlyWrong} of your mistakes, which points to a mix-up rather than a slip.</>}
        </p>

        {recurring.length > 0 && (
          <p className="mt-5 rounded-card border border-suspect/40 bg-suspect/[0.07] px-4 py-3 text-base">
            <span className="font-bold text-suspect">Recurring misconception: </span>
            {recurring.map((m) => m.label).join(", ")}.
          </p>
        )}
      </div>

      {targetFailed ? (
        <section
          aria-labelledby="gap-found"
          className="anim-rise relative mt-10 overflow-hidden rounded-panel border border-root/40 bg-ink-900 p-6 shadow-[var(--shadow-panel)] sm:p-8"
          style={{ animationDelay: "120ms" }}
        >
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-root/20 blur-3xl" />
          <h2 id="gap-found" className="relative flex items-center gap-2 text-lg font-bold text-root">
            <Crosshair aria-hidden className="size-5" /> Possible Root Gap found
          </h2>
          <p className="relative mt-2 max-w-xl text-lg text-text">
            You missed {target.name.toLowerCase()}. Your answers suggest the trouble may start further back. Patch will
            follow the trail one skill at a time and check each step before it tells you anything.
          </p>
          <Button size="lg" onClick={() => dispatch({ type: "trace" })} className="relative mt-6 w-full font-display text-xl tracking-wide sm:w-auto sm:px-10">
            TRACE MY GAP
          </Button>
        </section>
      ) : (
        <section className="mt-10 rounded-panel border border-solid/40 bg-ink-900 p-6">
          <h2 className="text-lg font-bold text-solid">No root gap to chase on this objective</h2>
          <p className="mt-2 text-muted">You solved the target question. Your Knowledge Map shows what&apos;s confirmed so far.</p>
          <Button className="mt-5" onClick={() => dispatch({ type: "goto", stage: "map" })}>Open my Knowledge Map</Button>
        </section>
      )}

      <div className="mt-8">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="expected-table"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-card text-base font-semibold text-muted hover:text-text"
        >
          <ChevronDown aria-hidden className={clsx("size-5 transition-transform duration-[var(--dur-base)]", open && "rotate-180")} />
          How the improvement score was worked out
        </button>
        {open && (
          <div id="expected-table" className="anim-rise mt-3 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <caption className="sr-only">Expected versus actual for each quiz question</caption>
              <thead className="bg-ink-800 text-faint">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Question</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Expected</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Result</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {score.scored.map(({ attempt, expected, points }) => (
                  <tr key={attempt.seq} className="border-t border-line">
                    <td className="math px-3 py-2">{formatMath(questionById[attempt.questionId].text)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted">{Math.round(expected * 100)}%</td>
                    <td className={clsx("px-3 py-2 font-semibold", attempt.correct ? "text-solid" : "text-gap")}>
                      {attempt.correct ? "Right" : "Wrong"}, {attempt.confidence === "sure" ? "sure" : "guess"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMath(points.toFixed(2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-3 py-2 text-sm text-faint">
              Points = result − expected, floored at −0.50. Score = average × 100. Everyone starts at 50% expected on untested skills.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
