"use client";

import clsx from "clsx";
import Link from "next/link";
import { FileText, RotateCcw, Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { APP_NAME } from "@/lib/config";
import type { SkillId } from "@/lib/content/types";
import type { CourseDef } from "@/lib/course";
import { makeFlow, type Action, type DemoState, type Stage } from "@/lib/demo/flow";
import type { Status } from "@/lib/engine/types";
import { testingExample } from "@/lib/learning/example";
import { toCourseDef } from "@/lib/learning/course";
import { validateCourse, type Course } from "@/lib/learning/schema";
import { toLiveView } from "@/lib/live/view";
import { CourseProvider } from "../CourseContext";
import { MapView } from "../demo/MapView";
import { Mission } from "../demo/Mission";
import { Quiz } from "../demo/Quiz";
import { Report } from "../demo/Report";
import { Reveal } from "../demo/Reveal";
import { Trace } from "../demo/Trace";
import { Victory } from "../demo/Victory";
import { MapStage } from "../MapStage";
import { Legend } from "../status";
import { Button, Wordmark } from "../ui";

const LOOP: { label: string; stages: Stage[] }[] = [
  { label: "Fight", stages: ["quiz", "report"] },
  { label: "Find", stages: ["trace", "reveal"] },
  { label: "Fix", stages: ["mission"] },
  { label: "Prove", stages: ["boss", "victory"] },
  { label: "Master", stages: ["map"] },
];

export function LearningApp() {
  const [course, setCourse] = useState<Course | null>(null);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" prefetch={false} className="shrink-0 rounded-md" aria-label={`${APP_NAME} home`}>
            <Wordmark>{APP_NAME}</Wordmark>
          </Link>
          {course && (
            <Button variant="ghost" size="sm" onClick={() => setCourse(null)}>New notes</Button>
          )}
        </div>
      </header>
      {course ? <Session course={course} /> : <UploadNotes onGenerated={setCourse} />}
    </div>
  );
}

const inputClass = "mt-2 w-full rounded-card border border-line-strong bg-ink-900 px-4 py-3 text-base text-text placeholder:text-faint focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong";

function UploadNotes({ onGenerated }: { onGenerated: (course: Course) => void }) {
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [objective, setObjective] = useState("");
  const [level, setLevel] = useState("College / undergraduate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "pdf" && (!file || file.size > 4 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf"))) return setError("Choose a PDF under 4 MB, or paste the text instead.");
    if (mode === "text" && notes.trim().length < 100) return setError("Paste at least 100 characters of notes.");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const form = new FormData();
      if (mode === "pdf" && file) form.set("file", file);
      else form.set("notes", notes);
      form.set("objective", objective);
      form.set("level", level);
      const response = await fetch("/api/learning/generate", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Generation failed. Try again.");
      let course: Course;
      try {
        course = validateCourse(result.course);
      } catch {
        throw new Error("The generated session didn't pass Patch's checks. Please try again.");
      }
      onGenerated(course);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Generation failed. Try again.");
    } finally {
      if (abort.current === controller) {
        setBusy(false);
        abort.current = null;
      }
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-16">
      <section>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Find what&apos;s blocking you in your own course.</h1>
        <p className="mt-4 text-lg text-muted">Upload notes. Patch maps the skills underneath, quizzes you, and traces your mistakes to the root.</p>
        <p className="mt-6 text-sm text-faint">Notes go to Google Gemini to build the session. Answers stay in this browser.</p>
      </section>

      <form onSubmit={submit} className="min-w-0 rounded-panel border border-line bg-ink-900/50 p-5 sm:p-7" aria-busy={busy}>
        <h2 className="font-display text-2xl font-bold">Build a learning session</h2>
        <fieldset disabled={busy} className="mt-6 grid min-w-0 gap-5">
          <legend className="sr-only">Lecture notes and learning goal</legend>
          <div className="flex gap-2" role="group" aria-label="Notes format">
            <Button variant={mode === "pdf" ? "primary" : "secondary"} aria-pressed={mode === "pdf"} onClick={() => setMode("pdf")}>
              <Upload aria-hidden className="size-4" /> PDF
            </Button>
            <Button variant={mode === "text" ? "primary" : "secondary"} aria-pressed={mode === "text"} onClick={() => setMode("text")}>
              <FileText aria-hidden className="size-4" /> Paste text
            </Button>
          </div>
          {mode === "pdf" ? (
            <div>
              <label htmlFor="notes-file" className="font-semibold">Lecture notes or slides</label>
              <input id="notes-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputClass} min-w-0 file:mr-3 file:rounded-card file:border-0 file:bg-ink-700 file:px-3 file:py-2 file:text-text`} />
            </div>
          ) : (
            <div>
              <label htmlFor="notes-text" className="font-semibold">Your notes</label>
              <textarea id="notes-text" rows={8} maxLength={60_000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Paste a lecture or chapter…" />
            </div>
          )}
          <div>
            <label htmlFor="learning-objective" className="font-semibold">Goal <span className="font-normal text-faint">(optional)</span></label>
            <input id="learning-objective" maxLength={300} value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} placeholder="e.g. Solve the time-independent Schrödinger equation" />
          </div>
          <div>
            <label htmlFor="learning-level" className="font-semibold">Level</label>
            <input id="learning-level" maxLength={100} value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass} required />
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setMode("text");
              setNotes(testingExample);
              setObjective("Choose software test techniques and interpret coverage for a given scenario");
            }}
          >
            Use the Software Testing Week 8 text example
          </Button>
        </fieldset>
        {error && <p role="alert" className="mt-5 rounded-card border border-gap/40 bg-gap/10 p-4 text-gap">{error}</p>}
        <Button type="submit" loading={busy} size="lg" className="mt-6 w-full">
          <Sparkles aria-hidden className="size-5" />
          {busy ? "Building your map… (about 2 minutes)" : "Generate my learning path"}
        </Button>
        {busy && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => abort.current?.abort()}>Cancel</Button>
        )}
      </form>
    </main>
  );
}

function Session({ course: generated }: { course: Course }) {
  const course = useMemo(() => toCourseDef(generated), [generated]);
  const flow = useMemo(() => makeFlow(course), [course]);
  const [state, setState] = useState<DemoState>(() => flow.initialState());
  const act = useCallback((a: Action) => setState((s) => flow.reducer(s, a)), [flow]);
  const view = useMemo(() => toLiveView(state, course), [state, course]);
  const mainRef = useRef<HTMLElement>(null);

  const stage = state.stage;
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [stage]);

  const props = { view, act, scripted: null, mode: "learn" as const };
  const loopIndex = LOOP.findIndex((l) => l.stages.includes(stage));

  return (
    <CourseProvider value={course}>
      {stage !== "intro" && (
        <div className="border-b border-line/50">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <ol className="flex min-w-0 items-center gap-0.5 sm:gap-1" aria-label="Learning loop">
              {LOOP.map((l, i) => (
                <li key={l.label}>
                  <span
                    aria-current={i === loopIndex ? "step" : undefined}
                    className={clsx("rounded-chip px-1.5 py-0.5 text-xs font-semibold sm:px-2 sm:text-sm", i === loopIndex ? "bg-beam/15 text-beam" : i < loopIndex ? "text-muted" : "text-faint")}
                  >
                    {l.label}
                  </span>
                </li>
              ))}
            </ol>
            <Button variant="ghost" size="sm" onClick={() => act({ type: "reset" })} className="shrink-0">
              <RotateCcw aria-hidden className="size-4" /> <span className="sr-only sm:not-sr-only">Restart</span>
            </Button>
          </div>
        </div>
      )}
      <main ref={mainRef} tabIndex={-1} className="flex-1 outline-none" aria-label="Learning session">
        {stage === "intro" && <Preview course={course} generated={generated} onStart={() => act({ type: "start" })} />}
        {stage === "quiz" && <Quiz {...props} />}
        {stage === "report" && <Report {...props} />}
        {stage === "trace" && <Trace {...props} />}
        {stage === "reveal" && <Reveal {...props} />}
        {(stage === "mission" || stage === "boss") && <Mission {...props} />}
        {stage === "victory" && <Victory {...props} />}
        {stage === "map" && <MapView {...props} />}
      </main>
    </CourseProvider>
  );
}

function Preview({ course, generated, onStart }: { course: CourseDef; generated: Course; onStart: () => void }) {
  const untested = Object.fromEntries(course.skills.map((s) => [s.id, "unknown"])) as Record<SkillId, Status>;
  const inferred = generated.skills.filter((s) => s.source.origin === "inferred").length;
  return (
    <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-12">
      <section>
        <p className="text-sm font-semibold text-beam">Your learning path</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance">{course.title}</h1>
        <p className="mt-3 text-lg text-muted">{generated.objective}</p>
        <dl className="mt-6 flex gap-8">
          <div><dd className="font-display text-3xl font-bold">{course.skills.length}</dd><dt className="text-sm text-muted">skills</dt></div>
          <div><dd className="font-display text-3xl font-bold">{course.quiz.length}</dd><dt className="text-sm text-muted">quiz questions</dt></div>
          <div><dd className="font-display text-3xl font-bold">{inferred}</dd><dt className="text-sm text-muted">added foundations</dt></div>
        </dl>
        <Button size="lg" className="mt-8" onClick={onStart}>Start my quiz</Button>
        <p className="mt-4 text-sm text-faint">AI-generated and AI-reviewed. Answers and links can still be wrong.</p>
      </section>
      <section aria-label="Skill map">
        <Legend />
        <MapStage status={untested} label={`Skill map for ${course.title}`} className="map-fit mt-4" />
      </section>
    </div>
  );
}

