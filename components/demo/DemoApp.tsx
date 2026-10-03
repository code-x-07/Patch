"use client";

import clsx from "clsx";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { initialState, reducer, type Stage } from "@/lib/demo/flow";
import { DEMO_STUDENT, scriptedAnswer } from "@/lib/demo/script";
import { toLiveView } from "@/lib/live/view";
import { Wordmark } from "../ui";
import { Intro } from "./Intro";
import { MapView } from "./MapView";
import { Mission } from "./Mission";
import { Quiz } from "./Quiz";
import { Report } from "./Report";
import { Reveal } from "./Reveal";
import { Teacher } from "./Teacher";
import { Trace } from "./Trace";
import { Victory } from "./Victory";

const LOOP: { label: string; stages: Stage[] }[] = [
  { label: "Fight", stages: ["quiz", "report"] },
  { label: "Find", stages: ["trace", "reveal"] },
  { label: "Fix", stages: ["mission"] },
  { label: "Prove", stages: ["boss", "victory"] },
  { label: "Master", stages: ["map", "teacher"] },
];

export function DemoApp() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const mainRef = useRef<HTMLElement>(null);

  // Everything the loop needs is in this bundle; wait for fonts before enabling Start.
  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  // New stage: move to the top and put focus on the main region for screen readers.
  const stage = state.stage;
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [stage]);

  // The demo builds the same projected view the server sends in Live Mode, so both share every screen.
  const view = useMemo(() => toLiveView(state), [state]);
  const status = view.status;
  const loopIndex = LOOP.findIndex((l) => l.stages.includes(stage));
  const scripted =
    follow && state.current && !state.feedback ? scriptedAnswer(DEMO_STUDENT, state.current.question, state.current.phase) : null;

  const shared = { view, act: dispatch, scripted, mode: "demo" as const };
  const demoOnly = { state, dispatch, status };

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
        {stage === "intro" && <Intro {...demoOnly} ready={ready} />}
        {stage === "quiz" && <Quiz {...shared} />}
        {stage === "report" && <Report {...shared} />}
        {stage === "trace" && <Trace {...shared} />}
        {stage === "reveal" && <Reveal {...shared} />}
        {(stage === "mission" || stage === "boss") && <Mission {...shared} />}
        {stage === "victory" && <Victory {...shared} />}
        {stage === "map" && <MapView {...shared} />}
        {stage === "teacher" && <Teacher {...demoOnly} />}
      </main>
    </div>
  );
}
