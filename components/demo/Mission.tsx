"use client";

import clsx from "clsx";
import { Check, Swords } from "lucide-react";
import { formatMath } from "@/lib/content/math";
import { skillById } from "@/lib/content/skills";
import type { Skill, SkillId } from "@/lib/content/types";
import type { Status } from "@/lib/engine/types";
import type { LiveView } from "@/lib/live/types";
import { lc } from "@/lib/text";
import { STATUS } from "../status";
import { Button } from "../ui";
import { QuestionCard } from "./QuestionCard";
import { cardFeedback, cardQuestion, type StageProps } from "./types";

type StepKey = "recap" | "lesson" | "practice" | "bridge" | "boss";

export function Mission({ view, act, scripted, busy }: StageProps) {
  const state = view;
  const status = view.status;
  const m = view.mission!;
  const plan = { ...m, practice: { length: m.practiceCount }, bridges: { length: m.bridgeCount } };
  const root = skillById[plan.root];
  const target = skillById[plan.target];
  const isBoss = state.stage === "boss";

  const steps: { key: StepKey; label: string }[] = [
    { key: "lesson", label: "Repair" },
    { key: "practice", label: `Practise ×${plan.practice.length}` },
    ...(plan.bridges.length ? [{ key: "bridge" as const, label: `Bridge ×${plan.bridges.length}` }] : []),
    { key: "boss", label: "Boss Fight" },
  ];
  const curKey: StepKey = isBoss ? "boss" : m.step;
  const curIdx = steps.findIndex((s) => s.key === curKey);

  return (
    <div
      className={clsx(
        "min-h-full transition-[background-color] duration-[var(--dur-slow)]",
        isBoss && "bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgb(255_79_123/0.14),transparent_70%)]",
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
        <header>
          <p className="text-sm font-semibold text-faint">
            Root Gap Mission{view.fast ? " · Fast Mode" : ""}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-balance sm:text-3xl">
            Repair {lc(root.name)}, then beat {lc(target.short)}.
          </h1>
          <QuestTrack path={plan.path} status={status} />
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
          ) : state.current ? (
            isBoss ? (
              <BossFrame role={state.current.role} target={target}>
                <QuestionCard
                  key={state.current.question.id}
                  tone="boss"
                  question={cardQuestion(state.current.question)}
                  feedback={cardFeedback(state.feedback)}
                  scripted={scripted}
                  busy={busy}
                  heading={state.current.role === "confirm" ? "One more, to lock it in" : "Never seen before"}
                  onAnswer={(optionIndex, confidence) => act({ type: "answer", optionIndex, confidence })}
                  onContinue={() => act({ type: "continue" })}
                  continueLabel={state.current.role === "confirm" || !state.feedback?.correct ? "Continue" : "Lock it in"}
                />
              </BossFrame>
            ) : (
              <QuestionCard
                key={state.current.question.id}
                question={cardQuestion(state.current.question)}
                feedback={cardFeedback(state.feedback)}
                scripted={scripted}
                busy={busy}
                heading={
                  state.current.role === "practice"
                    ? `Practise: ${root.name} (${m.index + 1} of ${plan.practice.length})`
                    : state.current.role === "extra"
                      ? `One more bridge check: ${skillById[state.current.question.skillId].name}`
                      : `Bridge: ${skillById[state.current.question.skillId].name} (${m.index + 1} of ${plan.bridges.length})`
                }
                context={
                  state.current.role === "bridge"
                    ? `Same idea, one step closer to ${lc(target.short)}.`
                    : state.current.role === "extra"
                      ? "That Boss Fight answer slipped. One quick check, then a fresh retry."
                      : undefined
                }
                onAnswer={(optionIndex, confidence) => act({ type: "answer", optionIndex, confidence })}
                onContinue={() => act({ type: "continue" })}
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuestTrack({ path, status }: { path: SkillId[]; status: Record<SkillId, Status> }) {
  return (
    <ol className="mt-5 flex items-stretch gap-0 overflow-hidden" aria-label="Repair path">
      {path.map((id, i) => {
        const st = status[id];
        const meta = STATUS[st];
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
                {skillById[id].short}
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
  const { lesson } = skill;
  return (
    <article className="anim-rise" aria-labelledby="lesson-h">
      {recap.length > 0 && (
        <section className="mb-8" aria-label="What Patch saw">
          <p className="text-sm font-semibold text-faint">What Patch saw</p>
          <ul className="mt-2 grid gap-2">
            {recap.map((r) => (
              <li key={r.text} className="flex flex-wrap items-baseline justify-between gap-2 rounded-card bg-ink-900/70 px-4 py-2.5">
                <span className="math text-lg">{formatMath(r.text)}</span>
                <span className="text-base text-gap">
                  you chose <span className="math font-semibold">{formatMath(r.chosen)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 id="lesson-h" className="font-display text-3xl font-bold">The one idea</h2>
      <p className="mt-3 text-xl leading-relaxed text-text">{lesson.idea}</p>

      {lesson.signGrid && <SignGrid />}

      <div className="mt-6 rounded-panel border border-line bg-ink-900/70 p-5">
        <p className="text-sm font-semibold text-faint">Worked example</p>
        <p className="math mt-1 text-2xl font-bold">{formatMath(lesson.example.prompt)}</p>
        <ol className="mt-3 grid gap-1.5">
          {lesson.example.steps.map((s, i) => (
            <li key={i} className="math flex gap-3 text-lg">
              <span aria-hidden className="text-faint tabular-nums">{i + 1}</span>
              {formatMath(s)}
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-5 border-l-2 border-gap/70 pl-4 text-lg">
        <span className="font-bold text-gap">Common mistake: </span>
        {formatMath(lesson.mistake)}
      </p>
      <p className="mt-4 text-lg text-muted">
        <span className="font-semibold text-text">Check yourself: </span>
        {formatMath(lesson.selfCheck)}
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

function BossFrame({ role, target, children }: { role: string; target: Skill; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="boss-h"
      className="relative rounded-panel border border-root/50 bg-ink-900/90 p-5 shadow-[0_0_0_1px_rgb(255_79_123/0.15),0_30px_80px_-30px_rgb(255_79_123/0.45)] sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full border border-root/60 bg-root/15">
          <Swords aria-hidden className="size-5 text-root" />
        </span>
        <div>
          <h2 id="boss-h" className="anim-stamp font-display text-2xl font-extrabold tracking-[0.08em] text-root">
            BOSS FIGHT
          </h2>
          <p className="text-sm text-muted">Back to the original: {target.name}</p>
        </div>
      </div>
      <p className="mt-4 text-base text-muted">
        {role === "confirm"
          ? "Transfer looks real. A second unseen question confirms you can do this on your own."
          : "A question you've never seen. Solve it on your own and the repair has transferred."}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}
