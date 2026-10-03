"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { joinClass, saveStudentSession, useStudentSession } from "@/lib/live/client";
import { Button, buttonClass } from "./ui";

const CODE = /^[A-Z0-9]{6}$/;

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const existing = useStudentSession();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!CODE.test(code)) return setError("Class codes are 6 letters or numbers. Check your teacher's screen.");
    if (!name.trim()) return setError("Add a first name or nickname so your teacher knows it's you.");
    setError(null);
    setBusy(true);
    try {
      const joined = await joinClass(code, name);
      saveStudentSession({ token: joined.token, classId: joined.class.id, className: joined.class.name, nickname: joined.nickname });
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-6">
      {existing && (
        <div className="rounded-panel border border-beam/40 bg-beam/[0.07] p-4">
          <p className="text-base">
            You&apos;re already in <strong>{existing.className}</strong> as <strong>{existing.nickname}</strong>.
          </p>
          <Link href="/play" className={buttonClass({ size: "sm", className: "mt-3" })}>Back to my class</Link>
        </div>
      )}
      <div>
        <label htmlFor="code" className="text-base font-semibold">Class code</label>
        <input
          id="code"
          name="code"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          aria-invalid={!!error && !CODE.test(code)}
          aria-describedby={error ? "join-error" : undefined}
          className="mt-2 block h-16 w-full rounded-card border border-line-strong bg-ink-900 px-4 text-center font-display text-3xl font-bold tracking-[0.3em] text-text placeholder:text-faint/60 focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong"
          placeholder="ABC234"
        />
      </div>
      <div>
        <label htmlFor="nick" className="text-base font-semibold">First name or nickname</label>
        <input
          id="nick"
          name="nickname"
          autoComplete="nickname"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={error ? "join-error" : undefined}
          className="mt-2 block h-14 w-full rounded-card border border-line-strong bg-ink-900 px-4 text-lg text-text focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong"
        />
      </div>

      {error && (
        <p id="join-error" role="alert" className="rounded-card border border-gap/50 bg-gap/10 px-4 py-3 text-base text-gap">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" loading={busy}>Join</Button>

      <p className="text-sm text-muted">
        <span className="font-semibold text-text">What&apos;s stored: </span>
        your nickname and your answers for this class only, so your teacher can see the class picture. No email, no password.
        Projected screens show class totals, never who&apos;s struggling. You can delete your data any time with{" "}
        <span className="font-semibold text-text">Leave class</span>.
      </p>
      <p className="text-sm text-muted">
        No class code? <Link href="/demo" className="font-semibold text-beam underline-offset-2 hover:underline">Try the demo</Link> with simulated classmates.
      </p>
    </form>
  );
}
