"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { DEMO_INFO } from "@/lib/course";
import { infoFromPublic } from "@/lib/learning/course";
import type { Course } from "@/lib/learning/schema";
import type { Action } from "@/lib/demo/flow";
import { ApiError, deleteMyData, getPlay, saveStudentSession, sendAction, useStudentSession, type PlayResponse } from "@/lib/live/client";
import { CourseProvider } from "../CourseContext";
import { MapStage } from "../MapStage";
import { MapView } from "../demo/MapView";
import { Mission } from "../demo/Mission";
import { Quiz } from "../demo/Quiz";
import { Report } from "../demo/Report";
import { Reveal } from "../demo/Reveal";
import { Trace } from "../demo/Trace";
import { Victory } from "../demo/Victory";
import type { StageProps } from "../demo/types";
import { Button, Wordmark } from "../ui";

const POLL_MS = 2000;

/**
 * A student in a live class. The server marks every answer and sends one
 * question at a time; this component only renders the projected view.
 */
export function StudentLive() {
  const router = useRouter();
  const session = useStudentSession();
  const token = session?.token ?? null;
  const [data, setData] = useState<PlayResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const lost = useCallback(() => {
    saveStudentSession(null);
    router.replace("/join");
  }, [router]);

  // No session in this browser: back to the join screen.
  useEffect(() => {
    if (session === null) router.replace("/join");
  }, [session, router]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setData(await getPlay(token));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) lost();
      else setError(e instanceof Error ? e.message : "Couldn't load your class.");
    }
  }, [token, lost]);

  // Wait in the lobby: poll every 2 seconds until the teacher starts.
  const waiting = !data || data.class.state === "lobby";
  useEffect(() => {
    if (!token) return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await getPlay(token);
        if (alive) { setData(d); setError(null); }
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) lost();
        else setError(e instanceof Error ? e.message : "Couldn't load your class.");
      }
    };
    tick();
    if (!waiting) return () => { alive = false; };
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [token, waiting, lost]);

  const act = useCallback(
    async (action: Action) => {
      if (!token || busy) return;
      setBusy(true);
      try {
        setData(await sendAction(token, action));
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return lost();
        setError(e instanceof Error ? e.message : "That didn't go through. Try again.");
        if (e instanceof ApiError && e.status === 409) refresh();
      } finally {
        setBusy(false);
      }
    },
    [token, busy, lost, refresh],
  );

  const stage = data?.view.stage;
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [stage]);

  async function leave() {
    if (!token) return;
    try {
      await deleteMyData(token);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) {
        setError(e instanceof Error ? e.message : "Couldn't delete your data. Try again.");
        return;
      }
    }
    saveStudentSession(null);
    router.replace("/join?left=1");
  }

  // The class's course: built-in algebra, or the teacher's uploaded notes.
  const pc = data?.course ?? null;
  const course = useMemo(() => (pc ? infoFromPublic(pc as unknown as Pick<Course, "title" | "targetSkillId" | "skills">) : DEMO_INFO), [pc]);
  const props: StageProps | null = data ? { view: data.view, act, scripted: null, mode: "live", busy } : null;

  return (
    <CourseProvider value={course}>
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" prefetch={false} className="shrink-0 rounded-md" aria-label={`${APP_NAME} home`}>
            <Wordmark>{APP_NAME}</Wordmark>
          </Link>
          {data && (
            <p className="ml-auto flex min-w-0 items-center gap-2 text-sm font-semibold text-muted">
              <Users aria-hidden className="size-4 shrink-0 text-beam" />
              <span className="truncate">{data.class.name}</span>
              <span className="text-faint">as</span>
              <span className="truncate text-text">{data.nickname}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-card px-2.5 text-sm font-semibold text-muted hover:bg-ink-800 hover:text-text"
          >
            <LogOut aria-hidden className="size-4" />
            <span className="hidden sm:inline">Leave class</span>
            <span className="sr-only sm:hidden">Leave class</span>
          </button>
        </div>
      </header>

      {confirmLeave && (
        <div role="alertdialog" aria-labelledby="leave-h" aria-describedby="leave-d" className="border-b border-gap/40 bg-gap/[0.07]">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex-1">
              <p id="leave-h" className="font-bold text-text">Leave and delete your data?</p>
              <p id="leave-d" className="text-sm text-muted">Your nickname and every answer in this class are deleted. This can&apos;t be undone.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={leave} autoFocus>Delete my data</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmLeave(false)}>Stay in class</Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mx-auto mt-4 w-[calc(100%-2rem)] max-w-3xl rounded-card border border-gap/50 bg-gap/10 px-4 py-3 text-base text-gap">
          {error}
        </p>
      )}

      <main ref={mainRef} tabIndex={-1} className="flex-1 outline-none" aria-label="Class Fight">
        {!props ? (
          <p className="mx-auto max-w-3xl px-4 py-16 text-lg text-muted" role="status">Loading your class…</p>
        ) : data!.class.state === "lobby" || props.view.stage === "intro" ? (
          <Lobby data={data!} />
        ) : (
          <>
            {stage === "quiz" && <Quiz {...props} />}
            {stage === "report" && <Report {...props} />}
            {stage === "trace" && <Trace {...props} />}
            {stage === "reveal" && <Reveal {...props} />}
            {(stage === "mission" || stage === "boss") && <Mission {...props} />}
            {stage === "victory" && <Victory {...props} />}
            {stage === "map" && <MapView {...props} />}
          </>
        )}
      </main>
    </div>
    </CourseProvider>
  );
}

function Lobby({ data }: { data: PlayResponse }) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div aria-live="polite">
        <p className="text-base font-semibold text-beam">You&apos;re in.</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Waiting for {data.class.name} to start
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Keep this page open. When your teacher starts the Class Fight, your first question appears here.
        </p>
        <p className="mt-6 flex items-center gap-3 text-base text-faint">
          <span aria-hidden className="relative flex size-3">
            <span className="motion-decor absolute inline-flex size-full animate-ping rounded-full bg-beam/60" />
            <span className="relative inline-flex size-3 rounded-full bg-beam" />
          </span>
          Checking every couple of seconds
        </p>
      </div>
      <div className="mx-auto w-full max-w-sm opacity-70" aria-hidden>
        <MapStage status={data.view.status} label="Your Knowledge Map, not tested yet" className="map-fit" />
      </div>
    </div>
  );
}
