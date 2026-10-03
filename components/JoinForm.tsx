"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, buttonClass } from "./ui";

/**
 * Live Mode (real classes) needs the database, which this build doesn't have
 * yet. The form validates and then says so plainly, pointing to the demo.
 */
export function JoinForm() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return setError("Class codes are 4 to 8 letters or numbers.");
    if (!name.trim()) return setError("Add a first name or nickname so your teacher knows it's you.");
    setError(null);
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-6">
      <div>
        <label htmlFor="code" className="text-base font-semibold">Class code</label>
        <input
          id="code"
          name="code"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          aria-invalid={!!error && !/^[A-Z0-9]{4,8}$/.test(code)}
          aria-describedby={error ? "join-error" : undefined}
          className="mt-2 block h-16 w-full rounded-card border border-line-strong bg-ink-900 px-4 text-center font-display text-3xl font-bold tracking-[0.3em] text-text placeholder:text-faint/60 focus:border-beam focus:outline-none focus-visible:outline-2 focus-visible:outline-beam-strong"
          placeholder="ABC123"
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

      <Button type="submit" size="lg">Join</Button>

      {submitted && (
        <div role="status" className="rounded-panel border border-suspect/40 bg-suspect/[0.07] p-5">
          <p className="text-lg font-bold text-suspect">Live classes aren&apos;t switched on in this version yet.</p>
          <p className="mt-2 text-base text-muted">
            Nothing was sent or saved. You can play the full experience, with simulated classmates, in the demo.
          </p>
          <Link href="/demo" className={buttonClass({ className: "mt-4" })}>
            Open the demo
          </Link>
        </div>
      )}

      <p className="text-sm text-muted">
        <span className="font-semibold text-text">What&apos;s stored: </span>
        in a live class, your nickname and your answers for that class only, so your teacher can see the class picture. No
        email, no password. Public screens show class totals, never who&apos;s struggling.
      </p>
    </form>
  );
}
