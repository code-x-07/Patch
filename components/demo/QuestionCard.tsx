"use client";

import clsx from "clsx";
import { Check, Repeat2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatMath } from "@/lib/content/math";
import type { Question } from "@/lib/content/types";
import type { ScriptedChoice } from "@/lib/demo/script";
import type { Confidence, Feedback } from "@/lib/engine";
import { Button } from "../ui";

type Props = {
  question: Question;
  feedback: Feedback | null;
  onAnswer: (optionIndex: number, confidence: Confidence) => void;
  onContinue: () => void;
  scripted?: ScriptedChoice | null;
  heading: string;
  context?: string;
  tone?: "default" | "boss";
  continueLabel?: string;
  /** In diagnosis, feedback is kept short so the trace keeps moving. */
  compactFeedback?: boolean;
  /** A request is in flight: lock the controls so nothing is submitted twice. */
  busy?: boolean;
};

export function QuestionCard({
  question, feedback, onAnswer, onContinue, scripted, heading, context, tone = "default", continueLabel = "Continue", compactFeedback, busy,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const legendId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);
  const answered = !!feedback;
  const chosen = feedback?.attempt.optionIndex ?? selected;
  const twoCol = question.options.every((o) => o.text.length <= 9);
  // Keep code snippets and conceptual wording intact in generated subjects.
  const display = question.verify.type === "conceptual" ? (text: string) => text : formatMath;

  useEffect(() => {
    if (answered) continueRef.current?.focus();
  }, [answered]);

  return (
    <div className={clsx("anim-rise", tone === "boss" && "relative")} key={question.id}>
      <fieldset aria-describedby={context ? `${legendId}-ctx` : undefined} disabled={answered}>
        <legend className="contents">
          <span className="block text-sm font-semibold text-faint">{heading}</span>
          <span
            className={clsx(
              "math mt-2 block whitespace-pre-wrap font-bold break-words text-balance text-text",
              tone === "boss" ? "font-display text-3xl sm:text-4xl" : "text-2xl sm:text-[1.75rem] leading-snug",
            )}
          >
            {display(question.text)}
          </span>
        </legend>
        {context && (
          <p id={`${legendId}-ctx`} className="mt-2 text-base text-muted">
            {context}
          </p>
        )}

        <div className={clsx("mt-6 grid gap-3", twoCol && "sm:grid-cols-2")} role="presentation">
          {question.options.map((o, i) => {
            const isChosen = chosen === i;
            const showCorrect = answered && o.correct;
            const showWrong = answered && isChosen && !o.correct;
            const isScript = !answered && scripted?.optionIndex === i;
            return (
              <label
                key={i}
                className={clsx(
                  "group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-card border bg-ink-900/80 px-4 py-3 transition-[border-color,background-color,transform,box-shadow] duration-[var(--dur-base)] ease-out",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-beam-strong",
                  !answered && !isChosen && "border-line hover:border-line-strong hover:bg-ink-800",
                  !answered && isChosen && "border-beam bg-beam/10 shadow-[var(--glow-beam)]",
                  showCorrect && "border-solid bg-solid/10",
                  showWrong && "anim-shake border-gap bg-gap/10",
                  answered && !showCorrect && !showWrong && "border-line opacity-55",
                  answered && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  className="sr-only"
                  checked={isChosen}
                  onChange={() => setSelected(i)}
                />
                <span
                  aria-hidden
                  className={clsx(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-sm font-bold transition-colors duration-[var(--dur-base)]",
                    isChosen && !answered ? "border-beam bg-beam text-ink-950" : "border-line-strong text-faint",
                    showCorrect && "border-solid bg-solid text-ink-950",
                    showWrong && "border-gap bg-gap text-ink-950",
                  )}
                >
                  {showCorrect ? <Check className="size-4" strokeWidth={3} /> : showWrong ? <X className="size-4" strokeWidth={3} /> : String.fromCharCode(65 + i)}
                </span>
                <span className="math min-w-0 whitespace-pre-wrap text-xl font-semibold break-words text-text">{display(o.text)}</span>
                {showCorrect && <span className="sr-only">(correct answer)</span>}
                {showWrong && <span className="sr-only">(your answer, incorrect)</span>}
                {isScript && (
                  <span className="ml-auto rounded-chip border border-dashed border-beam/60 px-1.5 py-0.5 text-xs font-semibold text-beam">
                    Script
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!answered && (
        <div className="mt-6" aria-live="polite">
          <p className="text-base font-semibold text-muted">
            {selected === null ? "Pick an answer, then lock it in." : "How sure are you?"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["sure", "guess"] as const).map((c) => (
              <Button
                key={c}
                variant={c === "sure" && selected !== null ? "primary" : "secondary"}
                size="lg"
                disabled={selected === null || busy}
                onClick={() => selected !== null && !busy && onAnswer(selected, c)}
                className="relative"
              >
                {c === "sure" ? "I'm sure" : "Guessing"}
                {scripted?.confidence === c && (
                  <span className={clsx("absolute top-1.5 right-2 size-1.5 rounded-full", c === "sure" && selected !== null ? "bg-ink-950" : "bg-beam")} aria-label="(scripted choice)" />
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <FeedbackPanel feedback={feedback} compact={compactFeedback} display={display}>
          <Button ref={continueRef} onClick={onContinue} loading={busy} size="lg" className="mt-5 w-full sm:w-auto">
            {continueLabel}
          </Button>
        </FeedbackPanel>
      )}
    </div>
  );
}

function FeedbackPanel({ feedback, compact, children, display }: { feedback: Feedback; compact?: boolean; children: React.ReactNode; display: (text: string) => string }) {
  const guessed = feedback.attempt.confidence === "guess";
  return (
    <div
      role="status"
      className={clsx(
        "anim-rise mt-6 rounded-panel border p-5",
        feedback.correct ? "border-solid/40 bg-solid/[0.07]" : "border-gap/40 bg-gap/[0.07]",
      )}
    >
      <p className={clsx("flex items-center gap-2 text-lg font-bold", feedback.correct ? "text-solid" : "text-gap")}>
        {feedback.correct ? <Check aria-hidden className="size-5" strokeWidth={3} /> : <X aria-hidden className="size-5" strokeWidth={3} />}
        {feedback.correct
          ? guessed
            ? "Right, but you guessed. That counts as shaky for now."
            : "Correct, and you were sure."
          : feedback.confidentlyWrong
            ? "Not quite. You were sure, so this is likely a mix-up worth fixing."
            : "Not quite."}
      </p>
      {!feedback.correct && feedback.message && (
        <p className="mt-2 text-lg text-text">{display(feedback.message)}</p>
      )}
      {!feedback.correct && feedback.confidentlyWrong && feedback.misconception && !compact && (
        <p className="mt-3 border-l-2 border-suspect/70 pl-3 text-base text-muted">
          <span className="font-semibold text-suspect">Likely misconception: {feedback.misconception.label}. </span>
          {display(feedback.misconception.explain)}
        </p>
      )}
      {feedback.recurring && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-chip border border-suspect/50 bg-suspect/10 px-2 py-1 text-sm font-semibold text-suspect">
          <Repeat2 aria-hidden className="size-4" /> This keeps coming up
        </p>
      )}
      {children}
    </div>
  );
}
