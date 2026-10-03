"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Sigma, Upload } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClass, saveTeacherClass, useTeacherClasses } from "@/lib/live/client";
import { Button, buttonClass } from "../ui";

type Topic = "builtin" | "pdf" | "text";

const input =
  "mt-2 block w-full rounded-card border border-line-strong bg-ink-900 px-4 text-lg text-text placeholder:text-faint/70 focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong";

export function TeacherHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState<Topic>("builtin");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState<null | "generating" | "creating">(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const mine = useTeacherClasses() ?? [];
  useEffect(() => () => abort.current?.abort(), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the class a name.");
    if (topic === "pdf" && (!file || !file.name.toLowerCase().endsWith(".pdf") || file.size > 8 * 1024 * 1024)) return setError("Choose a PDF under 8 MB.");
    if (topic === "text" && notes.trim().length < 100) return setError("Paste at least 100 characters of notes.");

    let course: unknown;
    try {
      if (topic !== "builtin") {
        // Build the class quiz from the teacher's notes (same pipeline as /learn).
        setBusy("generating");
        const controller = new AbortController();
        abort.current = controller;
        const form = new FormData();
        if (topic === "pdf" && file) form.set("file", file);
        else form.set("notes", notes);
        form.set("objective", goal);
        form.set("level", "School or college class");
        const res = await fetch("/api/learning/generate", { method: "POST", body: form, signal: controller.signal });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Couldn't build a quiz from those notes. Try again.");
        course = body.course;
      }
      setBusy("creating");
      const { class: c, teacherKey } = await createClass(name, course);
      saveTeacherClass({ id: c.id, name: c.name, joinCode: c.joinCode, teacherKey });
      router.push(`/teach/${c.id}`);
    } catch (err) {
      if (abort.current?.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Couldn't create the class. Try again.");
      setBusy(null);
    }
  }

  const choices: { key: Topic; label: string; icon: typeof Sigma }[] = [
    { key: "builtin", label: "Quadratics", icon: Sigma },
    { key: "pdf", label: "Upload PDF", icon: Upload },
    { key: "text", label: "Paste notes", icon: FileText },
  ];

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Start a Class Fight</h1>
      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-6" aria-busy={!!busy}>
        <fieldset disabled={!!busy} className="grid gap-6">
          <div>
            <label htmlFor="class-name" className="text-base font-semibold">Class name</label>
            <input id="class-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Year 10 Maths, period 3" className={clsx(input, "h-14")} />
          </div>

          <div role="radiogroup" aria-label="Quiz topic">
            <p className="text-base font-semibold">Topic</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {choices.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={topic === c.key}
                  onClick={() => setTopic(c.key)}
                  className={clsx(
                    "flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border px-2 text-sm font-semibold transition-colors",
                    topic === c.key ? "border-beam bg-beam/10 text-beam" : "border-line-strong bg-ink-900 text-muted hover:border-beam/60 hover:text-text",
                  )}
                >
                  <c.icon aria-hidden className="size-5" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {topic === "pdf" && (
            <div>
              <label htmlFor="class-pdf" className="text-base font-semibold">Notes or slides (PDF)</label>
              <input id="class-pdf" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={clsx(input, "py-3 text-base file:mr-3 file:rounded-card file:border-0 file:bg-ink-700 file:px-3 file:py-2 file:text-text")} />
            </div>
          )}
          {topic === "text" && (
            <div>
              <label htmlFor="class-notes" className="text-base font-semibold">Notes</label>
              <textarea id="class-notes" rows={7} maxLength={60_000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste a lecture or chapter…" className={clsx(input, "py-3 text-base")} />
            </div>
          )}
          {topic !== "builtin" && (
            <div>
              <label htmlFor="class-goal" className="text-base font-semibold">Goal <span className="font-normal text-faint">(optional)</span></label>
              <input id="class-goal" maxLength={300} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Apply Newton's second law" className={clsx(input, "h-14 text-base")} />
            </div>
          )}
        </fieldset>

        {error && <p role="alert" className="rounded-card border border-gap/50 bg-gap/10 px-4 py-3 text-gap">{error}</p>}
        <Button type="submit" size="lg" loading={!!busy}>
          {busy === "generating" ? "Building the quiz… (about 2 min)" : busy === "creating" ? "Creating class…" : "Create class"}
        </Button>
        {busy === "generating" && (
          <Button variant="ghost" size="sm" onClick={() => { abort.current?.abort(); setBusy(null); }}>Cancel</Button>
        )}
      </form>

      {mine.length > 0 && (
        <section className="mt-12" aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-lg font-bold">Your classes</h2>
          <ul className="mt-3 grid gap-2">
            {mine.map((c) => (
              <li key={c.id}>
                <Link href={`/teach/${c.id}`} className={buttonClass({ variant: "secondary", className: "w-full justify-between" })}>
                  <span className="truncate">{c.name}</span>
                  <span className="font-display tracking-[0.2em] text-beam">{c.joinCode}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
