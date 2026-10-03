"use client";

import clsx from "clsx";
import { Check, Swords } from "lucide-react";
import type { Skill, SkillId } from "@/lib/content/types";
import type { Status } from "@/lib/engine/types";
import type { LiveView } from "@/lib/live/types";
import { useCourse, useFmt } from "../CourseContext";
import { STATUS } from "../status";
import { Button } from "../ui";
import { QuestionCard } from "./QuestionCard";
import { cardFeedback, cardQuestion, type StageProps } from "./types";

type StepKey = "lesson" | "practice" | "bridge" | "boss";

export function Mission({ view, act, scripted, busy }: StageProps) {
  const course = useCourse();
  const m = view.mission!;
  const root = course.skillById[m.root];
  const target = course.skillById[m.target];
  const isBoss = view.stage === "boss";
  const cur = view.current;

  const steps: { key: StepKey; label: string }[] = [
    { key: "lesson", label: "Learn" },
    { key: "practice", label: `Practise ×${m.practiceCount}` },
    ...(m.bridgeCount ? [{ key: "bridge" as const, label: `Bridge ×${m.bridgeCount}` }] : []),
    { key: "boss", label: "Boss Fight" },
  ];
  const curIdx = steps.findIndex((s) => s.key === (isBoss ? "boss" : m.step));

  const card = cur && {
    question: cardQuestion(cur.question, course.conceptual),
    feedback: cardFeedback(view.feedback),
    scripted,
    busy,
    onAnswer: (optionIndex: number, confidence: "sure" | "guess") => act({ type: "answer", optionIndex, confidence }),
    onContinue: () => act({ type: "continue" }),
  };

  return (
    <div
      className={clsx(
        "min-h-full transition-[background-color] duration-[var(--dur-slow)]",
        isBoss && "bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgb(255_79_123/0.14),transparent_70%)]",
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
        <header>
          <p className="text-sm font-semibold text-faint">Root Gap Mission{view.fast ? " · Fast" : ""}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-balance sm:text-3xl">Fix {root.short.toLowerCase()}</h1>
          <QuestTrack path={m.path} status={view.status} />
          <ol className="mt-4 flex flex-wrap gap-2" aria-label="Mission steps">
            {steps.map((s, i) => (
              <li
                key={s.key}
                aria-current={i === curIdx ? "step" : undefined}
                className={clsx(
                  "flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-sm font-semibold",
                  i < curIdx && "border-solid/40 text-solid",
                  i === curIdx && (s.key === "boss" ? "border-root/60 bg-root/10 text-root" : "border-beam/60 bg-beam/10 text-beam"),
                  i > curIdx && "border-line text-faint",
                )}
              >
                {i < curIdx && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
                {s.label}
                <span className="sr-only">{i < curIdx ? " (done)" : i === curIdx ? " (current)" : ""}</span>
              </li>
            ))}
          </ol>
        </header>

        <div className="mt-8">
          {m.step === "lesson" && !isBoss ? (
            <Lesson skill={root} recap={view.fast ? [] : m.recap} busy={busy} onDone={() => act({ type: "lessonDone" })} />
          ) : card ? (
            isBoss ? (
              <section
                aria-labelledby="boss-h"
                className="relative rounded-panel border border-root/50 bg-ink-900/90 p-5 shadow-[0_0_0_1px_rgb(255_79_123/0.15),0_30px_80px_-30px_rgb(255_79_123/0.45)] sm:p-8"
              >
                <div className="mb-6 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full border border-root/60 bg-root/15">
                    <Swords aria-hidden className="size-5 text-root" />
                  </span>
                  <div>
                    <h2 id="boss-h" className="anim-stamp font-display text-2xl font-extrabold tracking-[0.08em] text-root">BOSS FIGHT</h2>
                    <p className="text-sm text-muted">{target.name}</p>
                  </div>
                </div>
                <QuestionCard
                  key={cur!.question.id}
                  tone="boss"
                  {...card}
                  heading={cur!.role === "confirm" ? "One more to confirm" : "New question"}
                  continueLabel={cur!.role === "confirm" || !view.feedback?.correct ? "Continue" : "Lock it in"}
                />
              </section>
            ) : (
              <QuestionCard
                key={cur!.question.id}
                {...card}
                heading={
                  cur!.role === "practice"
                    ? `Practise: ${root.short} (${m.index + 1} of ${m.practiceCount})`
                    : cur!.role === "extra"
                      ? `One more bridge check: ${course.skillById[cur!.question.skillId].short}`
                      : `Bridge: ${course.skillById[cur!.question.skillId].short} (${m.index + 1} of ${m.bridgeCount})`
                }
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuestTrack({ path, status }: { path: SkillId[]; status: Record<SkillId, Status> }) {
  const course = useCourse();
  return (
    <ol className="mt-5 flex items-stretch gap-0 overflow-hidden" aria-label="Repair path">
      {path.map((id, i) => {
        const meta = STATUS[status[id]];
        const Icon = meta.icon;
        return (
          <li key={id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-col items-center gap-1.5 px-0.5 text-center">
              <span
                className="grid size-9 place-items-center rounded-full border-2 transition-[border-color,background-color] duration-[var(--dur-slow)]"
                style={{ borderColor: meta.color, background: `color-mix(in oklab, ${meta.color} 16%, var(--color-ink-900))` }}
              >
                <Icon aria-hidden className="size-4" style={{ color: meta.color }} strokeWidth={2.6} />
              </span>
              <span className="line-clamp-2 text-[0.72rem] leading-tight font-semibold text-muted sm:text-xs">
                {course.skillById[id].short}
                <span className="sr-only">: {meta.label}</span>
              </span>
            </div>
            {i < path.length - 1 && (
              <span aria-hidden className="mb-6 h-0.5 min-w-2 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${meta.color}, ${STATUS[status[path[i + 1]]].color})`, opacity: 0.55 }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Lesson({ skill, recap, busy, onDone }: { skill: Skill; recap: NonNullable<LiveView["mission"]>["recap"]; busy?: boolean; onDone: () => void }) {
  const fmt = useFmt();
  const { lesson } = skill;
  return (
    <article className="anim-rise" aria-labelledby="lesson-h">
      {recap.length > 0 && (
        <ul className="mb-8 grid gap-2" aria-label="Your answers that led here">
          {recap.map((r) => (
            <li key={r.text} className="flex flex-wrap items-baseline justify-between gap-2 rounded-card bg-ink-900/70 px-4 py-2.5">
              <span className="math whitespace-pre-wrap">{fmt(r.text)}</span>
              <span className="text-sm text-gap">
                you chose <span className="math font-semibold">{fmt(r.chosen)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 id="lesson-h" className="font-display text-3xl font-bold">The one idea</h2>
      <p className="mt-3 text-xl leading-relaxed text-text">{fmt(lesson.idea)}</p>

      {lesson.signGrid && <SignGrid />}

      <div className="mt-6 rounded-panel border border-line bg-ink-900/70 p-5">
        <p className="text-sm font-semibold text-faint">Example</p>
        <p className="math mt-1 text-xl font-bold whitespace-pre-wrap">{fmt(lesson.example.prompt)}</p>
        <ol className="mt-3 grid gap-1.5">
          {lesson.example.steps.map((s, i) => (
            <li key={i} className="math flex gap-3 text-lg">
              <span aria-hidden className="text-faint tabular-nums">{i + 1}</span>
              <span className="whitespace-pre-wrap">{fmt(s)}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-5 border-l-2 border-gap/70 pl-4 text-lg">
        <span className="font-bold text-gap">Watch out: </span>
        {fmt(lesson.mistake)}
      </p>

      <Button size="lg" className="mt-8 w-full sm:w-auto sm:px-10" onClick={onDone} loading={busy}>
        I&apos;ve got it. Let&apos;s practise.
      </Button>
    </article>
  );
}

/** The sign rule as a small grid. */
function SignGrid() {
  const cells = [
    ["+", "+", "+"],
    ["+", "−", "−"],
    ["−", "+", "−"],
    ["−", "−", "+"],
  ];
  return (
    <table className="math mt-6 w-full max-w-sm overflow-hidden rounded-card border border-line text-center text-lg">
      <caption className="sr-only">Sign rule for multiplying and dividing</caption>
      <thead className="bg-ink-800 text-sm text-faint">
        <tr>
          <th scope="col" className="py-2 font-semibold">First</th>
          <th scope="col" className="py-2 font-semibold">Second</th>
          <th scope="col" className="py-2 font-semibold">Answer</th>
        </tr>
      </thead>
      <tbody>
        {cells.map(([a, b, r], i) => (
          <tr key={i} className="border-t border-line">
            <td className="py-2">{a}</td>
            <td className="py-2">{b}</td>
            <td className={clsx("py-2 font-bold", r === "+" ? "text-solid" : "text-gap")}>
              {r} <span className="text-sm font-semibold">{r === "+" ? "positive" : "negative"}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
