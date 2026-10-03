"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent } from "react";
import { BookOpen, Check, FileText, Sparkles, Upload, X } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { validateCourse, type Course } from "@/lib/learning/schema";
import { sessionEngine, type LearningState } from "@/lib/learning/session";
import { testingExample } from "@/lib/learning/example";
import { derive } from "@/lib/engine/evidence";
import { scoreQuiz } from "@/lib/engine/scoring";
import { Button, buttonClass, Wordmark } from "../ui";
import { QuestionCard } from "../demo/QuestionCard";
import { StatusChip } from "../status";
import { LearningMap } from "./LearningMap";

const inputClass = "mt-2 w-full rounded-card border border-line-strong bg-ink-900 px-4 py-3 text-base text-text placeholder:text-faint";

export function LearningApp() {
  const [course, setCourse] = useState<Course | null>(null);
  const [sourceName, setSourceName] = useState("");
  return <div className="min-h-dvh">
    <header className="border-b border-line bg-ink-950/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Patch home"><Wordmark>{APP_NAME}</Wordmark></Link>
        <nav aria-label="Learning navigation" className="flex flex-wrap justify-end gap-2">
          <Link href="/demo" prefetch={false} className={buttonClass({ variant: "ghost", size: "sm" })}>Original demo</Link>
          {course && <Button variant="secondary" size="sm" onClick={() => { setCourse(null); setSourceName(""); }}>New notes</Button>}
        </nav>
      </div>
    </header>
    {course ? <LearningSession course={course} sourceName={sourceName} /> : <UploadNotes onGenerated={(next, name) => { setCourse(next); setSourceName(name); }} />}
  </div>;
}

function UploadNotes({ onGenerated }: { onGenerated: (course: Course, sourceName: string) => void }) {
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
    if (mode === "pdf" && (!file || file.size > 8 * 1024 * 1024 || !file.name.toLowerCase().endsWith(".pdf"))) { setError("Choose a PDF smaller than 8 MB."); return; }
    if (mode === "text" && notes.trim().length < 100) { setError("Paste at least 100 characters of lecture notes."); return; }
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const form = new FormData();
      if (mode === "pdf" && file) form.set("file", file); else form.set("notes", notes);
      form.set("objective", objective); form.set("level", level);
      const response = await fetch("/api/learning/generate", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Generation failed. Try again.");
      let course: Course;
      try { course = validateCourse(result.course); }
      catch { throw new Error("The generated content could not be validated. Please try again."); }
      onGenerated(course, result.sourceName);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Generation failed. Please try again.");
    } finally { if (abort.current === controller) { setBusy(false); abort.current = null; } }
  }
  return <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-16">
    <section>
      <p className="flex items-center gap-2 text-sm font-semibold text-beam"><Sparkles aria-hidden className="size-4" /> Your notes. Your learning path.</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Find what’s blocking you in your own course.</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted">Bring your lecture notes. Patch builds a quiz and a connected skill map, then follows your mistakes to the foundation you need to repair.</p>
      <ol className="mt-8 grid gap-6">
        {[
          ["Bring the material", "Upload a PDF, including slide diagrams, or paste your notes."],
          ["Check the learning path", "Review the objective, source references and proposed prerequisite links."],
          ["Fight → Find → Fix → Prove", "Take the quiz, investigate a gap, learn the missing idea and test it on a new question."],
        ].map(([title, detail], i) => <li key={title} className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full border border-beam/40 font-bold text-beam">{i + 1}</span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-muted">{detail}</p></div></li>)}
      </ol>
      <div className="mt-8 border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-faint">Individual study session. No account or saved history. Your notes are sent to Google Gemini to generate and review content; your answers stay in this browser. Refreshing clears the session.</div>
    </section>
    <form onSubmit={submit} className="min-w-0 rounded-panel border border-line bg-ink-900/50 p-5 sm:p-7" aria-busy={busy}>
      <h2 className="font-display text-2xl font-bold">Build a learning session</h2>
      <fieldset disabled={busy} className="mt-6 grid min-w-0 gap-5">
        <legend className="sr-only">Lecture notes and learning goal</legend>
        <div className="flex gap-2" role="group" aria-label="Notes format">
          <Button variant={mode === "pdf" ? "primary" : "secondary"} aria-pressed={mode === "pdf"} onClick={() => setMode("pdf")}><Upload aria-hidden className="size-4" /> PDF</Button>
          <Button variant={mode === "text" ? "primary" : "secondary"} aria-pressed={mode === "text"} onClick={() => setMode("text")}><FileText aria-hidden className="size-4" /> Paste text</Button>
        </div>
        {mode === "pdf" ? <div><label htmlFor="notes-file" className="font-semibold">Lecture notes or slides</label><input id="notes-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputClass} min-w-0 file:mr-3 file:rounded-card file:border-0 file:bg-ink-700 file:px-3 file:py-2 file:text-text`} /><p className="mt-2 text-sm text-faint">One PDF, up to 8 MB. For long decks, choose a focused objective.</p></div>
          : <div><label htmlFor="notes-text" className="font-semibold">Your lecture notes</label><textarea id="notes-text" rows={8} maxLength={60_000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Paste a lecture, chapter or topic you want to understand…" /><p className="mt-1 text-sm text-faint">100–60,000 characters.</p></div>}
        <div><label htmlFor="learning-level" className="font-semibold">Student level</label><input id="learning-level" maxLength={100} value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass} required /></div>
        <div><label htmlFor="learning-objective" className="font-semibold">What do you want to be able to do? <span className="font-normal text-faint">Optional</span></label><input id="learning-objective" maxLength={300} value={objective} onChange={(e) => setObjective(e.target.value)} className={inputClass} placeholder="e.g. Design tests and interpret their coverage" /><p className="mt-2 text-sm text-faint">Leave blank and Patch will choose a focused objective from your notes.</p></div>
        <Button variant="ghost" onClick={() => { setMode("text"); setNotes(testingExample); setObjective("Choose software test techniques and interpret coverage for a given scenario"); }}>Use the Software Testing Week 8 text example</Button>
      </fieldset>
      {error && <p role="alert" className="mt-5 rounded-card border border-gap/40 bg-gap/10 p-4 text-gap">{error}</p>}
      <Button type="submit" loading={busy} size="lg" className="mt-6 w-full"><Sparkles aria-hidden className="size-5" />{busy ? "Generating and reviewing…" : "Generate my learning path"}</Button>
      {busy && <div className="mt-4" role="status"><p className="text-sm text-muted">Gemini is building the skill map, question variants and lessons, then reviewing the content. This can take a few minutes.</p><Button variant="ghost" size="sm" className="mt-2" onClick={() => abort.current?.abort()}>Cancel generation</Button></div>}
    </form>
  </main>;
}

function LearningSession({ course, sourceName }: { course: Course; sourceName: string }) {
  const engine = useMemo(() => sessionEngine(course), [course]);
  const [state, dispatch] = useReducer(engine.reducer, undefined, engine.initial);
  const [reviewed, setReviewed] = useState(false);
  const main = useRef<HTMLElement>(null);
  const derived = derive(engine.graph, state.learner);
  const target = course.skills.find((s) => s.id === course.targetSkillId)!;
  const root = course.skills.find((s) => s.id === state.root);
  const score = scoreQuiz(state.learner.attempts.filter((a) => a.phase === "quiz"));
  useEffect(() => { main.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }, [state.stage, state.current?.id]);
  const heading = state.stage === "quiz" ? `Fight · Question ${state.index + 1} of 8`
    : state.stage === "trace" ? "Find · Check the foundation"
    : state.stage === "practice" ? "Fix · Practise the missing skill"
    : state.stage === "bridge" ? "Fix · Bridge back to your objective"
    : state.bossPasses > 0 ? "Prove · One more fresh question" : "Prove · Boss Fight";
  const hasQuestion = state.current && ["quiz", "trace", "practice", "bridge", "boss"].includes(state.stage);
  const status = { ...derived.status };
  if (state.root && ["lesson", "practice"].includes(state.stage)) status[state.root] = "repairing";
  return <main ref={main} tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 outline-none sm:px-6">
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-faint">Individual study · {sourceName}</p>
      <p className="text-sm font-semibold text-beam">{state.stage === "preview" ? "Review" : state.stage === "quiz" || state.stage === "report" ? "Fight" : ["trace", "reveal"].includes(state.stage) ? "Find" : ["lesson", "practice", "bridge"].includes(state.stage) ? "Fix" : state.stage === "boss" ? "Prove" : "Your progress"}</p>
    </div>
    {state.stage === "preview" && <div className="grid gap-10 lg:grid-cols-2">
      <section><p className="text-sm font-semibold text-beam">Your learning path is ready</p><h1 className="mt-2 font-display text-4xl font-bold tracking-tight">{course.title}</h1><p className="mt-4 text-lg text-muted">{course.summary}</p><h2 className="mt-6 text-lg font-bold">Your objective</h2><p className="mt-2 text-xl">{course.objective}</p>
        <p className="mt-6 text-muted">Eight quiz questions start the investigation. Fresh diagnostic, repair and Boss Fight questions are reserved for later.</p>
        <div className="mt-6 rounded-card border border-suspect/40 bg-suspect/10 p-4 text-sm text-muted">AI-authored content has passed structural checks and an AI review. Answers and prerequisite links can still be wrong. Inspect the map and sources before you start; a diagnosis describes this session’s evidence, not a proven cause or lasting mastery.</div>
        <label className="mt-6 flex min-h-12 cursor-pointer items-start gap-3"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-beam)]" /><span>I’ve reviewed the objective and map and want to study this content.</span></label>
        <Button size="lg" disabled={!reviewed} className="mt-4" onClick={() => dispatch({ type: "start" })}>Start my quiz</Button>
        <details className="mt-7"><summary className="min-h-11 cursor-pointer font-semibold text-muted">Review generated lessons</summary><div className="mt-3 grid gap-4">{course.skills.map((s) => <article key={s.id} className="border-l-2 border-line-strong pl-4"><h3 className="font-bold">{s.name}</h3><p className="mt-1 text-muted">{s.lesson.idea}</p><p className="mt-2 text-sm text-faint">{s.source.reference}</p></article>)}</div></details>
      </section><LearningMap course={course} />
    </div>}
    {hasQuestion && <div className={`grid gap-10 ${state.stage === "trace" ? "lg:grid-cols-2" : "mx-auto max-w-3xl"}`}>
      {state.stage === "trace" && <div className="order-2 lg:order-1"><LearningMap course={course} status={status} focus={state.current!.skillId} /></div>}
      <section className="order-1 min-w-0 lg:order-2"><h1 className="mb-4 font-display text-2xl font-bold">{heading}</h1><p className="mb-5 text-muted">{state.stage === "boss" ? `Back to ${target.name}. Two fresh correct-and-sure answers are needed to verify transfer.` : state.stage === "trace" ? "Patch checks earlier skills using distinct questions. Correct guesses don’t confirm knowledge." : course.skills.find((s) => s.id === state.current!.skillId)?.name}</p>
        <QuestionCard key={state.current!.id} question={state.current!} feedback={state.feedback} heading={course.skills.find((s) => s.id === state.current!.skillId)!.short} onAnswer={(option, confidence) => dispatch({ type: "answer", option, confidence })} onContinue={() => dispatch({ type: "continue" })} tone={state.stage === "boss" ? "boss" : "default"} />
        {state.feedback && <div className="mt-4 border-t border-line pt-4 text-sm text-muted"><p className="font-semibold text-text">Answer explanation</p><p className="mt-1 whitespace-pre-wrap">{course.questions.find((q) => q.id === state.current!.id)!.rationale}</p><p className="mt-2 text-faint">{course.questions.find((q) => q.id === state.current!.id)!.source.reference}</p></div>}
      </section>
    </div>}
    {state.stage === "report" && <section className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-faint">Your Fight Report</p><h1 className="mt-2 font-display text-4xl font-bold">{score.correct} of {score.total} correct</h1><p className="mt-4 text-lg text-muted">{course.objective}</p><p className="mt-5 text-muted">{state.learner.attempts.filter((a) => a.confidence === "guess").length} guesses · {state.learner.attempts.filter((a) => !a.correct && a.confidence === "sure").length} confident mistakes. Growth score: {score.improvement >= 0 ? "+" : ""}{score.improvement}, compared with this session’s initial estimate.</p><p className="mt-6 text-lg">{state.learner.attempts.some((a) => a.skillId === course.targetSkillId && !a.correct) ? "You missed the target skill. Follow the trail to check which earlier idea may be getting in the way." : "Your target answer was correct. You can check the foundations or prove the objective with fresh questions."}</p><div className="mt-7 flex flex-wrap gap-3"><Button size="lg" onClick={() => dispatch({ type: "trace" })}>TRACE MY GAP</Button><Button variant="secondary" onClick={() => dispatch({ type: "prove" })}>Try fresh target questions</Button><Button variant="ghost" onClick={() => dispatch({ type: "map" })}>Open my map</Button></div></section>}
    {state.stage === "reveal" && <div className="grid gap-10 lg:grid-cols-2"><LearningMap course={course} status={status} focus={state.root} /><section><p className="text-sm font-semibold text-root">{root ? "Root gap supported by your answers" : "Diagnosis complete"}</p><h1 className="mt-3 font-display text-4xl font-bold">{root ? `Start with ${root.name.toLowerCase()}.` : state.diagnosis?.uncertain ? "The evidence is mixed." : "No root gap was confirmed."}</h1><p className="mt-5 text-lg text-muted">{root ? `This earlier skill may be blocking ${target.name.toLowerCase()}. Patch checked distinct questions and the foundations below it.` : state.diagnosis?.uncertain ? "Patch ran out of fresh checks or found conflicting answers. It won’t force a diagnosis. Review the evidence with a tutor or start a new session." : "This run hasn’t established an underlying gap. Check the map or attempt fresh target questions."}</p>
      {state.diagnosis && state.diagnosis.rootGaps.length > 1 && <p className="mt-4 text-muted">There are {state.diagnosis.rootGaps.length} possible root gaps. This mission addresses one; the map retains the others.</p>}
      <Evidence course={course} state={state} />
      <div className="mt-6 flex flex-wrap gap-3">{root ? <><Button size="lg" onClick={() => dispatch({ type: "repair" })}>Start my Root Gap Mission</Button><Button variant="ghost" onClick={() => dispatch({ type: "dispute" })}>That doesn’t sound right</Button></> : !state.diagnosis?.uncertain && <Button onClick={() => dispatch({ type: "prove" })}>Prove the objective</Button>}<Button variant="secondary" onClick={() => dispatch({ type: "map" })}>Open my map</Button></div>
    </section></div>}
    {state.stage === "lesson" && root && <article className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-beam">Fix · Root Gap Mission</p><h1 className="mt-3 font-display text-3xl font-bold">{root.name}</h1><p className="mt-5 text-xl leading-relaxed">{root.lesson.idea}</p><div className="mt-7 rounded-panel border border-line bg-ink-900 p-5"><h2 className="font-bold text-faint">Worked example</h2><p className="mt-3 whitespace-pre-wrap text-lg font-semibold">{root.lesson.example.prompt}</p><ol className="mt-4 grid list-decimal gap-3 pl-5 text-muted">{root.lesson.example.steps.map((s, i) => <li key={i} className="whitespace-pre-wrap">{s}</li>)}</ol></div><p className="mt-5 border-l-2 border-gap pl-4"><strong>Common mistake: </strong>{root.lesson.mistake}</p><p className="mt-5 text-muted"><strong className="text-text">Check yourself: </strong>{root.lesson.selfCheck}</p><p className="mt-4 text-sm text-faint">{root.source.reference}</p><p className="mt-6 text-sm text-muted">Repair path: {state.mission!.path.map((id) => course.skills.find((s) => s.id === id)!.short).join(" → ")}</p><Button size="lg" className="mt-7" onClick={() => dispatch({ type: "practise" })}><BookOpen aria-hidden className="size-5" />Let’s practise</Button></article>}
    {state.stage === "result" && state.result && <section className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-faint">Your session result</p><h1 className="mt-3 font-display text-4xl font-bold">{state.result.transferVerified ? "TRANSFER VERIFIED" : "More support would help."}</h1><div className="mt-7 grid gap-4">{state.root && <Outcome success={state.result.rootDefeated} title={state.result.rootDefeated ? "ROOT GAP DEFEATED" : "Root skill needs more practice"} detail={root!.name} />}<Outcome success={state.result.transferVerified} title={state.result.transferVerified ? "Original objective solved independently" : "Transfer not yet verified"} detail={target.name} /></div><p className="mt-6 text-muted">{state.result.needsSupport ? "Bring these attempts to a tutor or lecturer. Fresh question variants ran out or the repair hasn’t been demonstrated yet." : "This is evidence from today’s session. Long-term retention hasn’t been tested, and other skills keep their own evidence status."}</p><div className="mt-7 flex flex-wrap gap-3"><Button size="lg" onClick={() => dispatch({ type: "map" })}>Open my Knowledge Map</Button><Button variant="secondary" onClick={() => { setReviewed(false); dispatch({ type: "restart" }); }}>Restart this session</Button></div></section>}
    {state.stage === "map" && <div className="grid gap-10 lg:grid-cols-2"><LearningMap course={course} status={status} /><section><h1 className="font-display text-3xl font-bold">Your Knowledge Map</h1><p className="mt-4 text-muted">Solid requires two distinct correct-and-sure answers, or an inference from a confirmed harder skill. A gap requires two distinct failures. Each skill keeps its own evidence.</p><Evidence course={course} state={state} /><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => dispatch({ type: "result" })}>Back to my result</Button><Button variant="secondary" onClick={() => { setReviewed(false); dispatch({ type: "restart" }); }}>Restart this session</Button></div></section></div>}
  </main>;
}

function Evidence({ course, state }: { course: Course; state: LearningState }) {
  const engine = sessionEngine(course);
  const evidence = derive(engine.graph, state.learner);
  return <details className="mt-6 rounded-card border border-line bg-ink-900 p-4"><summary className="min-h-11 cursor-pointer font-bold">Why Patch thinks this · View evidence</summary><ul className="mt-3 grid gap-4">{course.skills.map((s) => <li key={s.id} className="border-t border-line pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.name}</strong><StatusChip status={evidence.status[s.id]} label={evidence.status[s.id] === "inferred_known" ? "Solid (inferred)" : undefined} /></div><p className="mt-2 text-sm text-muted">{evidence.direct[s.id].passQs.length} distinct correct-and-sure answers · {evidence.direct[s.id].failQs.length} distinct failures{evidence.inferredFrom[s.id]?.length ? ` · Inferred from ${evidence.inferredFrom[s.id]!.map((id) => course.skills.find((s) => s.id === id)!.name).join(", ")}` : ""}</p><ul className="mt-2 grid gap-1 text-sm text-faint">{state.learner.attempts.filter((a) => a.skillId === s.id).map((a) => <li key={a.seq}>{course.questions.find((q) => q.id === a.questionId)!.text} — {a.correct ? "correct" : "incorrect"}, {a.confidence}{a.disputed ? " (disputed; excluded)" : ""}</li>)}</ul></li>)}</ul></details>;
}

function Outcome({ success, title, detail }: { success: boolean; title: string; detail: string }) {
  return <div className={`rounded-card border p-5 ${success ? "border-solid/40 bg-solid/10" : "border-suspect/40 bg-suspect/10"}`}><h2 className={`flex items-center gap-2 text-lg font-bold ${success ? "text-solid" : "text-suspect"}`}>{success ? <Check aria-hidden className="size-5" /> : <X aria-hidden className="size-5" />}{title}</h2><p className="mt-2 text-muted">{detail}</p></div>;
}
