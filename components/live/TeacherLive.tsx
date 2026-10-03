"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DEMO_INFO } from "@/lib/course";
import type { ClassReport } from "@/lib/demo/classroom";
import { infoFromPublic } from "@/lib/learning/course";
import type { Course } from "@/lib/learning/schema";
import { ApiError, deleteClass, forgetTeacherClass, getDashboard, setClassState, useTeacherClasses } from "@/lib/live/client";
import type { ClassInfo } from "@/lib/live/types";
import { CourseProvider } from "../CourseContext";
import { ClassInsight } from "../teacher/ClassInsight";
import { Button, buttonClass } from "../ui";

type Dashboard = {
  class: ClassInfo;
  course: Pick<Course, "title" | "targetSkillId" | "skills"> | null;
  roster: { nickname: string; stage: string; answered: number }[];
  report: ClassReport;
  quizTotal: number;
};

const STAGE_LABEL: Record<string, string> = {
  intro: "Waiting",
  quiz: "Quiz",
  report: "Fight Report",
  trace: "Tracing",
  reveal: "Root gap found",
  mission: "Mission",
  boss: "Boss Fight",
  victory: "Finished loop",
  map: "Finished loop",
};

const POLL_MS = 2000;
const noSubscribe = () => () => {};

export function TeacherLive({ classId }: { classId: string }) {
  const router = useRouter();
  const classes = useTeacherClasses();
  const held = classes === undefined ? undefined : (classes?.find((c) => c.id === classId) ?? null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pc = data?.course ?? null;
  const course = useMemo(() => (pc ? infoFromPublic(pc) : DEMO_INFO), [pc]);
  const host = useSyncExternalStore(noSubscribe, () => window.location.host, () => "");

  const teacherKey = held?.teacherKey;
  const load = useCallback(async () => {
    if (!teacherKey) return;
    try {
      setData(await getDashboard<Dashboard>(classId, teacherKey));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the class.");
      if (e instanceof ApiError && e.status === 404) forgetTeacherClass(classId);
    }
  }, [classId, teacherKey]);

  // Live status: poll every 2 seconds (more reliable than sockets on school networks).
  useEffect(() => {
    if (!teacherKey) return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await getDashboard<Dashboard>(classId, teacherKey);
        if (alive) { setData(d); setError(null); }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Couldn't load the class.");
        if (e instanceof ApiError && e.status === 404) forgetTeacherClass(classId);
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [classId, teacherKey]);

  async function change(state: "live" | "finished") {
    if (!held) return;
    setBusy(true);
    try {
      await setClassState(classId, held.teacherKey, state);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the class.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!held) return;
    setBusy(true);
    try {
      await deleteClass(classId, held.teacherKey);
      forgetTeacherClass(classId);
      router.replace("/teach");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the class.");
      setBusy(false);
    }
  }

  if (held === undefined) return <p className="mx-auto max-w-3xl px-4 py-16 text-lg text-muted" role="status">Loading…</p>;
  if (held === null) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold">This browser can&apos;t open that class</h1>
        <p className="mt-3 text-lg text-muted">The teacher key is stored in the browser that created the class. Open the dashboard there, or start a new class.</p>
        <Link href="/teach" className={buttonClass({ className: "mt-6" })}>Start a class</Link>
      </main>
    );
  }

  const state = data?.class.state ?? "lobby";
  const joined = data?.roster.length ?? 0;

  const controls = (
    <>
      {state === "lobby" && (
        <Button onClick={() => change("live")} loading={busy} disabled={joined === 0}>
          <Play aria-hidden className="size-4" /> Start the quiz
        </Button>
      )}
      {state === "live" && (
        <Button variant="secondary" onClick={() => change("finished")} loading={busy}>
          <Square aria-hidden className="size-4" /> End class
        </Button>
      )}
      <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
        <Trash2 aria-hidden className="size-4" /> Delete class data
      </Button>
    </>
  );

  return (
    <div className="pb-16">
      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-panel border border-beam/40 bg-ink-900 p-6 shadow-[var(--shadow-panel)]">
          <p className="text-base font-semibold text-muted">
            {state === "lobby" ? "Students join at" : state === "live" ? "Live now. Latecomers can still join at" : "Class ended"}
          </p>
          {state !== "finished" && (
            <>
              <p className="mt-1 text-xl font-semibold break-all text-text">{host ? `${host}/join` : "/join"}</p>
              <p className="mt-4 text-sm font-semibold text-faint">Class code</p>
              <p className="font-display text-6xl font-extrabold tracking-[0.18em] text-beam sm:text-7xl" aria-label={`Class code ${held.joinCode.split("").join(" ")}`}>
                {held.joinCode}
              </p>
            </>
          )}
          <p className="mt-4 text-base text-muted">
            Topic: <strong className="text-text">{course.title}</strong>
          </p>
          <p className="mt-2 text-lg">
            <strong className="font-display text-2xl tabular-nums">{joined}</strong> {joined === 1 ? "student has" : "students have"} joined

          </p>
        </div>

        <div className="rounded-panel border border-line bg-ink-900/70 p-6">
          <h2 className="text-lg font-bold">Students</h2>
          {data && data.roster.length > 0 ? (
            <ul className="mt-3 grid max-h-72 gap-1.5 overflow-y-auto text-sm" aria-label="Where each student is (your screen only)">
              {data.roster.map((r) => (
                <li key={r.nickname} className="flex justify-between gap-3 border-t border-line pt-1.5">
                  <span className="truncate">{r.nickname}</span>
                  <span className="text-muted">{STAGE_LABEL[r.stage] ?? r.stage}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">No one yet.</p>
          )}
          <p className="mt-3 text-xs text-faint">Not shown in Present mode.</p>
        </div>
      </section>

      {confirmDelete && (
        <div role="alertdialog" aria-labelledby="del-h" className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-panel border border-gap/50 bg-gap/[0.07] p-5 sm:flex-row sm:items-center">
            <p id="del-h" className="flex-1 font-semibold">Delete this class and every student&apos;s answers? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={remove} loading={busy} autoFocus>Delete everything</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Keep the class</Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mx-auto mt-6 w-[calc(100%-2rem)] max-w-7xl rounded-card border border-gap/50 bg-gap/10 px-4 py-3 text-gap">{error}</p>
      )}

      {data && (
        <CourseProvider value={course}>
        <ClassInsight
          report={data.report}
          classLabel={`Live class: ${joined} ${joined === 1 ? "student" : "students"}`}
          actions={controls}
        />
        </CourseProvider>
      )}
    </div>
  );
}
