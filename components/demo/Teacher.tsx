"use client";

import clsx from "clsx";
import { Check, Crosshair, Maximize2, Minimize2, TriangleAlert, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMath } from "@/lib/content/math";
import { OBJECTIVE_NAME, skillById, TARGET_SKILL } from "@/lib/content/skills";
import type { SkillId } from "@/lib/content/types";
import { classReport, CLASSMATES, simulatedClassmates, type ClassReport, type Member } from "@/lib/demo/classroom";
import { lc } from "@/lib/demo/view";
import { byId, graph, shortestPath, type Status } from "@/lib/engine";
import { MapStage } from "../MapStage";
import { STATUS } from "../status";
import { Button } from "../ui";
import type { StageProps } from "./types";

let cachedMates: Member[] | null = null;
const mates = () => (cachedMates ??= simulatedClassmates());

const LEVEL_STATUS: Record<ClassReport["heatmap"][SkillId]["level"], Status> = {
  strong: "known",
  mixed: "suspect",
  common_gap: "gap",
  untested: "unknown",
};
const LEVEL_LABEL = { strong: "Strong", mixed: "Mixed", common_gap: "Common gap", untested: "Not tested" } as const;

export function Teacher({ state, dispatch }: StageProps) {
  const [present, setPresent] = useState(false);
  const [refresher, setRefresher] = useState(false);

  const report = useMemo(() => {
    const you: Member | null = state.diagnosed
      ? {
          id: "you", name: "You", simulated: false,
          diagnosed: state.diagnosed, current: state.learner,
          rootGaps: state.diagnosis?.rootGaps ?? [], uncertain: state.diagnosis?.uncertain ?? false,
          rootDefeated: state.result?.rootDefeated ?? false,
          transferVerified: state.result?.transferVerified ?? false,
          needsTeacher: state.result?.needsTeacher ?? false,
        }
      : null;
    return classReport(you ? [...mates(), you] : mates());
  }, [state.diagnosed, state.learner, state.diagnosis, state.result]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPresent(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present]);

  const rec = report.recommendation;
  const heatStatus = Object.fromEntries(graph.ids.map((id) => [id, LEVEL_STATUS[report.heatmap[id].level]])) as Record<SkillId, Status>;
  const heat = Object.fromEntries(graph.ids.map((id) => [id, report.heatmap[id].share])) as Record<SkillId, number>;
  const topMisconception = report.misconceptions.find((m) => m.classWide);
  const includesYou = !!state.diagnosed;
  const classLabel = `Simulated class: ${CLASSMATES.length} simulated classmates${includesYou ? " + you" : ""}`;

  const body = (
    <div className={clsx("mx-auto grid max-w-7xl gap-8 px-4 sm:px-6", present ? "py-8 lg:grid-cols-[1fr_1fr] lg:gap-14" : "py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-10")}>
      <div className="grid content-start gap-8">
        <header>
          <p className="inline-flex items-center gap-2 rounded-chip border border-beam/40 bg-beam/10 px-2.5 py-1 text-sm font-semibold text-beam">
            <Users aria-hidden className="size-4" /> {classLabel}
          </p>
          <h1 className={clsx("mt-3 font-display font-bold tracking-tight text-balance", present ? "text-5xl" : "text-3xl sm:text-4xl")}>
            Class Fight: {OBJECTIVE_NAME}
          </h1>
          {!present && (
            <p className="mt-2 text-base text-muted">
              Every number here is computed from the same engine attempts as your own run. No individual weaknesses are shown on
              this screen.
            </p>
          )}
        </header>

        {rec && (
          <section
            aria-labelledby="rec-h"
            className="relative overflow-hidden rounded-panel border border-beam/40 bg-ink-900 p-6 shadow-[var(--shadow-panel)]"
          >
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-56 rounded-full bg-beam/15 blur-3xl" />
            <h2 id="rec-h" className="relative text-base font-bold text-beam">Recommended teacher action</h2>
            <p className={clsx("relative mt-2 font-display font-bold text-balance", present ? "text-4xl" : "text-2xl sm:text-3xl")}>
              5-minute refresher: {skillById[rec.root].name}
            </p>
            <p className={clsx("relative mt-3 text-muted", present ? "text-2xl" : "text-lg")}>
              <strong className="text-text">{rec.affected} of {rec.classSize} students</strong> have a verified gap in{" "}
              {lc(skillById[rec.root].name)}, which may be blocking {lc(skillById[rec.target].name)}. Start with that prerequisite.
            </p>
            <RefresherPath root={rec.root} />
            {!present && (
              <Button className="relative mt-5" onClick={() => setRefresher((r) => !r)} aria-expanded={refresher} aria-controls="refresher">
                {refresher ? "Hide refresher" : "Start refresher"}
              </Button>
            )}
            {refresher && !present && <Refresher root={rec.root} />}
          </section>
        )}

        <Distribution report={report} large={present} />

        {topMisconception && (
          <section aria-labelledby="misc-h" className="rounded-panel border border-suspect/40 bg-suspect/[0.06] p-6">
            <h2 id="misc-h" className="flex items-center gap-2 text-base font-bold text-suspect">
              <TriangleAlert aria-hidden className="size-5" /> Class-wide misconception detected
            </h2>
            <p className={clsx("mt-2", present ? "text-3xl" : "text-xl")}>
              <span className="font-display font-bold tabular-nums">{Math.round(topMisconception.share * 100)}%</span> of the class
              chose answers that suggest: <strong>{lc(topMisconception.misconception.label)}</strong>.
            </p>
            {!present && <p className="mt-2 text-base text-muted">{formatMath(topMisconception.misconception.explain)}</p>}
          </section>
        )}
      </div>

      <div className="grid content-start gap-8">
        <section aria-labelledby="heat-h">
          <h2 id="heat-h" className="text-lg font-bold">Class Knowledge Heatmap</h2>
          <p className="mt-1 text-base text-muted">Glow size shows the share of the class with a suspected or confirmed gap at each skill.</p>
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
          <MapStage status={heatStatus} heat={heat} label="Class heatmap on the skill tree" className={clsx("mt-3", present ? "max-w-xl" : "max-w-lg")} />
          <details className="mt-2">
            <summary className="min-h-10 cursor-pointer text-sm font-semibold text-muted">Show as a table</summary>
            <table className="mt-2 w-full text-left text-sm">
              <caption className="sr-only">Share of class weak at each skill</caption>
              <thead className="text-faint">
                <tr><th scope="col" className="py-1">Skill</th><th scope="col" className="py-1">Weak</th><th scope="col" className="py-1">Level</th></tr>
              </thead>
              <tbody>
                {[...graph.ids].sort(byId).map((id) => (
                  <tr key={id} className="border-t border-line">
                    <td className="py-1.5">{skillById[id].name}</td>
                    <td className="py-1.5 tabular-nums">{report.heatmap[id].weak} of {report.classSize}</td>
                    <td className="py-1.5">{LEVEL_LABEL[report.heatmap[id].level]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <RepairAndStatus report={report} large={present} />
      </div>
    </div>
  );

  if (present) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Present mode" className="atmosphere fixed inset-0 z-50 overflow-y-auto">
        <div className="sticky top-0 z-10 flex justify-end bg-ink-950/80 px-4 py-3 backdrop-blur">
          <Button variant="secondary" size="sm" onClick={() => setPresent(false)} autoFocus>
            <Minimize2 aria-hidden className="size-4" /> Exit Present mode
          </Button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-end gap-3 px-4 pt-6 sm:px-6">
        <Button variant="secondary" onClick={() => dispatch({ type: "goto", stage: "map" })}>Back to my map</Button>
        <Button onClick={() => setPresent(true)}>
          <Maximize2 aria-hidden className="size-4" /> Present mode
        </Button>
      </div>
      {body}
    </>
  );
}

function RefresherPath({ root }: { root: SkillId }) {
  // Generated from the graph: the shortest path from the gap up to the target.
  const path = shortestPath(graph, root, TARGET_SKILL, () => false) ?? [root];
  return (
    <p className="relative mt-4 text-sm text-muted">
      <span className="font-semibold text-faint">Likely blocking path: </span>
      {path.map((id) => skillById[id].name).join(" → ")}
    </p>
  );
}

function Refresher({ root }: { root: SkillId }) {
  const s = skillById[root];
  return (
    <div id="refresher" className="anim-rise relative mt-5 rounded-card border border-line bg-ink-800/70 p-5">
      <p className="text-sm font-semibold text-faint">Refresher preview (whole class)</p>
      <p className="mt-2 text-lg">{s.lesson.idea}</p>
      <p className="math mt-3 text-xl font-bold">{formatMath(s.lesson.example.prompt)}</p>
      <ol className="mt-1 grid gap-1">
        {s.lesson.example.steps.map((st, i) => <li key={i} className="math text-lg text-muted">{formatMath(st)}</li>)}
      </ol>
      <p className="mt-3 text-base"><span className="font-semibold text-gap">Watch for: </span>{formatMath(s.lesson.mistake)}</p>
    </div>
  );
}

function Distribution({ report, large }: { report: ClassReport; large: boolean }) {
  const max = Math.max(1, ...report.distribution.map((d) => d.count));
  return (
    <section aria-labelledby="dist-h">
      <h2 id="dist-h" className={clsx("font-bold", large ? "text-2xl" : "text-lg")}>Root Gap Distribution</h2>
      <p className={clsx("mt-1 text-muted", large ? "text-xl" : "text-base")}>
        {report.struggling} of {report.classSize} students struggled with {lc(skillById[report.target].name)}. Where their trouble starts:
      </p>
      <ul className="mt-4 grid gap-3" aria-hidden>
        {report.distribution.map((d) => (
          <li key={d.skill ?? "other"} className="group grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,15rem)_1fr]" title={`${d.skill ? skillById[d.skill].name : "Other or uncertain"}: ${d.count} students`}>
            <span className={clsx("line-clamp-2 font-semibold leading-snug", large ? "text-xl" : "text-base")}>{d.skill ? skillById[d.skill].name : "Other or uncertain"}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-6 rounded-r-[4px] bg-beam transition-[width,opacity] duration-[var(--dur-slow)] group-hover:opacity-80"
                style={{ width: `${(d.count / max) * 85}%`, opacity: d.skill ? 1 : 0.45 }}
              />
              <span className={clsx("font-bold tabular-nums", large ? "text-xl" : "text-base")}>{d.count}</span>
            </span>
          </li>
        ))}
      </ul>
      {/* sr-only can't shrink a table, so hide a wrapper instead. */}
      <div className="sr-only">
      <table>
        <caption>Root gap distribution</caption>
        <tbody>
          {report.distribution.map((d) => (
            <tr key={d.skill ?? "other"}><th scope="row">{d.skill ? skillById[d.skill].name : "Other or uncertain"}</th><td>{d.count} students</td></tr>
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
    { label: "started a repair mission", value: repair.started, icon: Crosshair, cls: "text-root" },
    { label: "defeated their root gap", value: repair.defeated, icon: Check, cls: "text-solid" },
    { label: "passed the original question", value: repair.transferred, icon: Check, cls: "text-beam" },
    { label: "need you in person", value: repair.needsTeacher, icon: X, cls: "text-suspect" },
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
        <dl className="mt-3 grid grid-cols-2 gap-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-card border border-line bg-ink-900/70 p-4">
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
        <h2 id="status-h" className={clsx("font-bold", large ? "text-2xl" : "text-lg")}>Class status now on {lc(skillById[report.target].short)}</h2>
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
                {s.label} <span className="tabular-nums text-muted">{s.n} of {classSize}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
