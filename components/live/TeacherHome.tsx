"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClass, saveTeacherClass, useTeacherClasses } from "@/lib/live/client";
import { Button, buttonClass } from "../ui";

export function TeacherHome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = useTeacherClasses() ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the class a name, like “Year 10 Maths”.");
    setBusy(true);
    setError(null);
    try {
      const { class: c, teacherKey } = await createClass(name);
      saveTeacherClass({ id: c.id, name: c.name, joinCode: c.joinCode, teacherKey });
      router.push(`/teach/${c.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the class. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Start a Class Fight</h1>
      <p className="mt-3 text-lg text-muted">
        Your class plays the quadratic equations quiz on their phones. Patch traces each student&apos;s root gap and shows you
        the class picture. Students join with a code and a nickname: no accounts.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5">
        <div>
          <label htmlFor="class-name" className="text-base font-semibold">Class name</label>
          <input
            id="class-name"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={error ? "teach-error" : undefined}
            placeholder="Year 10 Maths, period 3"
            className="mt-2 block h-14 w-full rounded-card border border-line-strong bg-ink-900 px-4 text-lg text-text placeholder:text-faint/70 focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong"
          />
        </div>
        {error && <p id="teach-error" role="alert" className="rounded-card border border-gap/50 bg-gap/10 px-4 py-3 text-gap">{error}</p>}
        <Button type="submit" size="lg" loading={busy}>Create class</Button>
        <p className="text-sm text-muted">
          A teacher key is saved in this browser so only you can run and see this class. Use the same browser for the dashboard.
        </p>
      </form>

      {mine.length > 0 && (
        <section className="mt-12" aria-labelledby="mine-h">
          <h2 id="mine-h" className="text-lg font-bold">Your classes on this browser</h2>
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
