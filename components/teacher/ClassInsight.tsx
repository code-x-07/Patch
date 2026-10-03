"use client";

import clsx from "clsx";
import { BookOpen, Check, Crosshair, Maximize2, Minimize2, TriangleAlert, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SkillId } from "@/lib/content/types";
import type { ClassReport } from "@/lib/demo/classroom";
import { byId } from "@/lib/engine/graph";
import type { Status } from "@/lib/engine/types";
import { useCourse, useFmt } from "../CourseContext";
import { MapStage } from "../MapStage";
import { STATUS } from "../status";
import { Button } from "../ui";

// Presentational only: no question bank or answer keys are imported here, so
// Live Mode can render it without shipping answers to the browser.

const LEVEL_STATUS: Record<ClassReport["heatmap"][SkillId]["level"], Status> = {
  strong: "known",
  mixed: "suspect",
  common_gap: "gap",
  untested: "unknown",
};
const LEVEL_LABEL = { strong: "Strong", mixed: "Mixed", common_gap: "Common gap", untested: "Not tested" } as const;

export function ClassInsight({
  report,
  classLabel,
  actions,
}: {
  report: ClassReport;
  classLabel: string;
  /** Extra controls shown beside the Present mode button. */
  actions?: ReactNode;
}) {
  const course = useCourse();
  const [present, setPresent] = useState(false);
  const [refresher, setRefresher] = useState(false);
  const rec = report.recommendation;
  const heatStatus = Object.fromEntries(course.graph.ids.map((id) => [id, LEVEL_STATUS[report.heatmap[id].level]])) as Record<SkillId, Status>;
  const heat = Object.fromEntries(course.graph.ids.map((id) => [id, report.heatmap[id].share])) as Record<SkillId, number>;
  const misc = report.misconceptions.find((m) => m.classWide);
  const big = present;

  const body = (
    <div className={clsx("mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", present ? "lg:gap-14" : "lg:py-10")}>
      <div className="grid content-start gap-7">
        <header>
          <p className="inline-flex items-center gap-2 rounded-chip border border-beam/40 bg-beam/10 px-2.5 py-1 text-sm font-semibold text-beam">
            <Users aria-hidden className="size-4" /> {classLabel}
          </p>
          <h1 className={clsx("mt-3 font-display font-bold tracking-tight text-balance", big ? "text-5xl" : "text-3xl sm:text-4xl")}>
            {course.title}
          </h1>
        </header>

        {report.classSize === 0 && <p className="rounded-panel border border-line bg-ink-900/70 p-6 text-lg text-muted">Waiting for answers.</p>}

        {rec && (
          <section aria-labelledby="rec-h" className="relative overflow-hidden rounded-panel border border-beam/40 bg-ink-900 p-6 shadow-[var(--shadow-panel)]">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-beam/15 blur-3xl" />
            <h2 id="rec-h" className="relative text-sm font-bold text-beam">Recommended teacher action</h2>
            <p className={clsx("relative mt-1 font-display font-bold text-balance", big ? "text-4xl" : "text-2xl sm:text-3xl")}>
              Reteach {course.skillById[rec.skill].short.toLowerCase()}
            </p>
            <p className={clsx("relative mt-2 text-muted", big ? "text-2xl" : "text-lg")}>
              {rec.kind === "root" ? (
                <>
                  <strong className="text-text">{rec.affected} of {rec.classSize} students</strong> started here
                  {rec.stillStuck !== rec.affected && <> · <strong className="text-text">{rec.stillStuck}</strong> still stuck</>}
                </>
              ) : (
                <>
                  <strong className="text-text">{rec.weakNow} of {rec.classSize} students</strong> weak here now ·{" "}
                  {course.skillById[rec.fixedRoot].short.toLowerCase()} mostly fixed
                </>
              )}
            </p>
            {!present && (
              <>
                <Button className="relative mt-5" variant="secondary" size="sm" onClick={() => setRefresher((r) => !r)} aria-expanded={refresher} aria-controls="refresher">
                  <BookOpen aria-hidden className="size-4" /> {refresher ? "Hide refresher" : "5-minute refresher"}
                </Button>
                {refresher && <Refresher root={rec.skill} />}
              </>
            )}
          </section>
        )}

        <Distribution report={report} large={big} />

        {misc && (
          <p className={clsx("flex items-start gap-2 rounded-panel border border-suspect/40 bg-suspect/[0.06] p-5", big ? "text-2xl" : "text-lg")}>
            <TriangleAlert aria-hidden className="mt-1 size-5 shrink-0 text-suspect" />
            <span>
              <strong className="font-display tabular-nums">{Math.round(misc.share * 100)}%</strong> {misc.misconception.label.toLowerCase()}
            </span>
          </p>
        )}
      </div>

      <div className="grid content-start gap-7">
        <section aria-labelledby="heat-h">
          <h2 id="heat-h" className={clsx("font-bold", big ? "text-2xl" : "text-lg")}>Where the class is now</h2>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Heatmap legend">
            {(["common_gap", "mixed", "strong", "untested"] as const).map((l) => {
              const meta = STATUS[LEVEL_STATUS[l]];
              const Icon = meta.icon;
              return (
                <li key={l} className={clsx("inline-flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-sm font-semibold", meta.text)}>
                  <Icon aria-hidden className="size-3.5" strokeWidth={2.5} /> {LEVEL_LABEL[l]}
                </li>
              );
            })}
          </ul>
          <MapStage status={heatStatus} heat={heat} label="Class heatmap on the skill tree" className={clsx("mt-3", present ? "map-fit-present max-w-xl" : "max-w-lg")} />
          <details className="mt-2">
            <summary className="min-h-10 cursor-pointer text-sm font-semibold text-muted">As a table</summary>
            <table className="mt-2 w-full text-left text-sm">
              <caption className="sr-only">Students weak at each skill now</caption>
              <thead className="text-faint">
                <tr><th scope="col" className="py-1">Skill</th><th scope="col" className="py-1">Weak now</th><th scope="col" className="py-1">Level</th></tr>
              </thead>
              <tbody>
                {[...course.graph.ids].sort(byId).map((id) => (
                  <tr key={id} className="border-t border-line">
                    <td className="py-1.5">{course.skillById[id].name}</td>
                    <td className="py-1.5 tabular-nums">{report.heatmap[id].weak} of {report.classSize}</td>
                    <td className="py-1.5">{LEVEL_LABEL[report.heatmap[id].level]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <RepairAndStatus report={report} large={big} />
      </div>
    </div>
  );

  if (present) return <PresentDialog onClose={() => setPresent(false)}>{body}</PresentDialog>;

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-end gap-3 px-4 pt-6 sm:px-6">
        {actions}
        <Button onClick={() => setPresent(true)}>
          <Maximize2 aria-hidden className="size-4" /> Present mode
        </Button>
      </div>
      {body}
    </>
  );
}

/** Native modal dialog: traps focus, makes the page behind inert, closes on Escape. */
function PresentDialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Present mode"
      onClose={onClose}
      className="atmosphere fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto p-0 text-text backdrop:bg-ink-950"
    >
      <div className="sticky top-0 z-10 flex justify-end bg-ink-950/80 px-4 py-3 backdrop-blur">
        <Button variant="secondary" size="sm" onClick={() => ref.current?.close()} autoFocus>
          <Minimize2 aria-hidden className="size-4" /> Exit Present mode
        </Button>
      </div>
      {children}
    </dialog>
  );
}

function Refresher({ root }: { root: SkillId }) {
  const s = useCourse().skillById[root];
  const formatMath = useFmt();
  return (
    <div id="refresher" className="anim-rise relative mt-4 rounded-card border border-line bg-ink-800/70 p-5">
      <p className="text-lg">{s.lesson.idea}</p>
      <p className="math mt-3 text-xl font-bold">{formatMath(s.lesson.example.prompt)}</p>
      <ol className="mt-1 grid gap-1">
        {s.lesson.example.steps.map((st, i) => <li key={i} className="math text-lg text-muted">{formatMath(st)}</li>)}
      </ol>
      <p className="mt-3 text-base"><span className="font-semibold text-gap">Watch for: </span>{formatMath(s.lesson.mistake)}</p>
    </div>
  );
}

function Distribution({ report, large }: { report: ClassReport; large: boolean }) {
  const course = useCourse();
  const max = Math.max(1, ...report.distribution.map((d) => d.count));
  const name = (s: SkillId | null) => (s ? course.skillById[s].short : "Unclear");
  return (
    <section aria-labelledby="dist-h">
      <h2 id="dist-h" className={clsx("font-bold", large ? "text-2xl" : "text-lg")}>
        Root gaps found <span className="font-normal text-muted">· {report.struggling} of {report.classSize} struggled</span>
      </h2>
      <ul className="mt-4 grid gap-3" aria-hidden>
        {report.distribution.map((d) => (
          <li key={d.skill ?? "other"} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]" title={`${name(d.skill)}: ${d.count}`}>
            <span className={clsx("truncate font-semibold", large ? "text-xl" : "text-base")}>{name(d.skill)}</span>
            <span className="flex items-center gap-2">
              <span className="h-6 rounded-r-[4px] bg-beam" style={{ width: `${(d.count / max) * 85}%`, opacity: d.skill ? 1 : 0.45 }} />
              <span className={clsx("font-bold tabular-nums", large ? "text-xl" : "text-base")}>{d.count}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* sr-only can't shrink a table, so hide a wrapper instead. */}
      <div className="sr-only">
        <table>
          <caption>Root gaps found</caption>
          <tbody>
            {report.distribution.map((d) => (
              <tr key={d.skill ?? "other"}><th scope="row">{name(d.skill)}</th><td>{d.count} students</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RepairAndStatus({ report, large }: { report: ClassReport; large: boolean }) {
  const { repair, status, classSize } = report;
  const tiles = [
    { label: "on a mission", value: repair.started, icon: Crosshair, cls: "text-root" },
    { label: "root gap fixed", value: repair.defeated, icon: Check, cls: "text-solid" },
    { label: "transfer verified", value: repair.transferred, icon: Check, cls: "text-beam" },
    { label: "need you", value: repair.needsTeacher, icon: X, cls: "text-suspect" },
  ];
  const segs = [
    { label: "Strong", n: status.strong, st: "known" as Status },
    { label: "Developing", n: status.developing, st: "suspect" as Status },
    { label: "Needs support", n: status.needsSupport, st: "gap" as Status },
  ];
  return (
    <>
      <section aria-labelledby="repair-h">
        <h2 id="repair-h" className={clsx("font-bold", large ? "text-2xl" : "text-lg")}>Repair progress</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-card border border-line bg-ink-900/70 p-3">
              <dd className={clsx("flex items-center gap-2 font-display font-bold tabular-nums", large ? "text-5xl" : "text-3xl")}>
                <t.icon aria-hidden className={clsx("size-5", t.cls)} strokeWidth={3} />
                {t.value}
              </dd>
              <dt className={clsx("mt-1 text-muted", large ? "text-lg" : "text-sm")}>{t.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="status-h">
        <h2 id="status-h" className={clsx("font-bold", large ? "text-2xl" : "text-lg")}>Class status</h2>
        <div className="mt-3 flex h-4 gap-[2px] overflow-hidden rounded-[4px]" aria-hidden>
          {segs.filter((s) => s.n > 0).map((s) => (
            <span key={s.label} style={{ flexGrow: s.n, background: STATUS[s.st].color }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {segs.map((s) => {
            const meta = STATUS[s.st];
            const Icon = meta.icon;
            return (
              <li key={s.label} className={clsx("flex items-center gap-1.5 font-semibold", large ? "text-xl" : "text-base")}>
                <Icon aria-hidden className={clsx("size-4", meta.text)} strokeWidth={2.6} />
                {s.label} <span className="tabular-nums text-muted">{s.n}/{classSize}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
