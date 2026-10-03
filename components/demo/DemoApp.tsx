"use client";

import clsx from "clsx";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import type { Action, DemoState, Stage } from "@/lib/demo/flow";
import { Wordmark } from "../ui";
import { Intro } from "./Intro";
import { MapView } from "./MapView";
import { Mission } from "./Mission";
import { Quiz } from "./Quiz";
import { Report } from "./Report";
import { Reveal } from "./Reveal";
import { Teacher } from "./Teacher";
import { Trace } from "./Trace";
import type { DemoRuntime } from "./types";
import { Victory } from "./Victory";

const LOOP: { label: string; stages: Stage[] }[] = [
  { label: "Fight", stages: ["quiz", "report"] },
  { label: "Find", stages: ["trace", "reveal"] },
  { label: "Fix", stages: ["mission"] },
  { label: "Prove", stages: ["boss", "victory"] },
  { label: "Master", stages: ["map", "teacher"] },
];

export function DemoApp() {
  const [runtime, setRuntime] = useState<DemoRuntime | null>(null);
  const [changed, setState] = useState<DemoState | null>(null);
  const [fastPick, setFastPick] = useState(false);
  const [follow, setFollow] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  // Load the demo runtime (engine, content, answer key) and fonts *before* enabling
  // Start. After that the whole loop runs offline: nothing else is fetched.
  useEffect(() => {
    let alive = true;
    Promise.all([import("@/lib/demo/runtime"), document.fonts.ready]).then(([rt]) => alive && setRuntime(rt));
    return () => { alive = false; };
  }, []);
  const ready = runtime !== null;

  const initial = useMemo(() => runtime?.initialState(fastPick) ?? null, [runtime, fastPick]);
  const state = changed ?? initial;
  const dispatch = useCallback(
    (action: Action) => {
      if (!runtime) return;
      if (action.type === "toggleFast" && !changed) return setFastPick((f) => !f);
      setState((s) => runtime.reducer(s ?? runtime.initialState(fastPick), action));
    },
    [runtime, changed, fastPick],
  );

  // New stage: move to the top and put focus on the main region for screen readers.
  const stage = state?.stage ?? "intro";
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [stage]);

  // The demo builds the same projected view the server sends in Live Mode, so both share every screen.
  const view = useMemo(() => (runtime && state ? runtime.toLiveView(state, runtime.DEMO_COURSE) : null), [runtime, state]);
  const loopIndex = LOOP.findIndex((l) => l.stages.includes(stage));
  const scripted =
    runtime && follow && state?.current && !state.feedback
      ? runtime.scriptedAnswer(runtime.DEMO_STUDENT, state.current.question, state.current.phase)
      : null;

  const shared = view ? { view, act: dispatch, scripted, mode: "demo" as const } : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          {/* No prefetch: the demo must make no network requests once it's ready. */}
          <Link href="/" prefetch={false} className="shrink-0 rounded-md" aria-label={`${APP_NAME} home`}>
            <Wordmark>{APP_NAME}</Wordmark>
          </Link>
          <ol className="mx-auto hidden items-center gap-1 md:flex" aria-label="Learning loop">
            {LOOP.map((l, i) => (
              <li key={l.label} className="flex items-center gap-1">
                <span
                  aria-current={i === loopIndex ? "step" : undefined}
                  className={clsx(
                    "rounded-chip px-2.5 py-1 text-sm font-semibold transition-colors duration-[var(--dur-base)]",
                    i === loopIndex ? "bg-beam/15 text-beam" : i < loopIndex ? "text-muted" : "text-faint",
                  )}
                >
                  {l.label}
                </span>
                {i < LOOP.length - 1 && <span aria-hidden className="h-px w-4 bg-line-strong" />}
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-card px-2 text-sm font-semibold text-muted hover:text-text">
              <input type="checkbox" className="peer sr-only" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
              <span aria-hidden className="relative h-5 w-9 rounded-full bg-ink-700 transition-colors peer-checked:bg-beam/70 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-beam-strong after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-text after:transition-transform peer-checked:after:translate-x-4" />
              <span className="hidden sm:inline">Show script</span>
              <span className="sm:hidden">Script</span>
            </label>
            {stage !== "intro" && (
              <button
                type="button"
                onClick={() => dispatch({ type: "reset" })}
                className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-card px-2.5 text-sm font-semibold text-muted hover:bg-ink-800 hover:text-text"
              >
                <RotateCcw aria-hidden className="size-4" />
                <span className="hidden sm:inline">Reset demo</span>
                <span className="sr-only sm:hidden">Reset demo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={mainRef} tabIndex={-1} className="flex-1 outline-none" aria-label="Demo">
        {stage === "intro" && (
          <Intro
            ready={ready}
            fast={state?.fast ?? fastPick}
            onStart={() => dispatch({ type: "start" })}
            onToggleFast={() => dispatch({ type: "toggleFast" })}
          />
        )}
        {shared && stage === "quiz" && <Quiz {...shared} />}
        {shared && stage === "report" && <Report {...shared} />}
        {shared && stage === "trace" && <Trace {...shared} />}
        {shared && stage === "reveal" && <Reveal {...shared} />}
        {shared && (stage === "mission" || stage === "boss") && <Mission {...shared} />}
        {shared && stage === "victory" && <Victory {...shared} />}
        {shared && stage === "map" && <MapView {...shared} />}
        {runtime && state && stage === "teacher" && <Teacher state={state} dispatch={dispatch} runtime={runtime} />}
      </main>
    </div>
  );
}
