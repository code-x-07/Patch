import type { Question } from "@/lib/content/types";
import type { Action } from "@/lib/demo/flow";
import type { ScriptedChoice } from "@/lib/demo/script";
import type { Feedback } from "@/lib/engine/learner";
import type { Attempt } from "@/lib/engine/types";
import type { LiveFeedback, LiveView, PublicQuestion } from "@/lib/live/types";

/**
 * Every student screen renders from a LiveView. The demo builds it in the
 * browser; Live Mode gets it from the server, which never includes answers for
 * unanswered questions. Screens must not import the question bank.
 */
export type StageProps = {
  view: LiveView;
  act: (action: Action) => void;
  /** Demo only: the scripted student's choice for the current question. */
  scripted: ScriptedChoice | null;
  mode: "demo" | "live";
  /** A request is in flight (Live Mode). */
  busy?: boolean;
};

/** Adapt a public question to the QuestionCard's shape (answer flags only once answered). */
export function cardQuestion(q: PublicQuestion): Question {
  return {
    id: q.id,
    skillId: q.skillId,
    kind: "check",
    tier: 1,
    text: q.text,
    verify: { type: "num", expr: "" },
    options: q.options.map((o) => ({ text: o.text, correct: !!o.correct })),
  };
}

export function cardFeedback(f: LiveFeedback | null): Feedback | null {
  if (!f) return null;
  return {
    correct: f.correct,
    message: f.message,
    misconception: f.misconception ? { id: "", message: "", ...f.misconception } : undefined,
    confidentlyWrong: f.confidentlyWrong,
    recurring: f.recurring,
    attempt: { optionIndex: f.optionIndex, confidence: f.confidence } as Attempt,
  };
}

/** Demo-only screens (intro, simulated teacher view) work on the local demo state directly. */
export type DemoRuntime = typeof import("@/lib/demo/runtime");

export type DemoOnlyProps = {
  state: import("@/lib/demo/flow").DemoState;
  dispatch: (action: Action) => void;
  runtime: DemoRuntime;
};
