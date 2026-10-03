import { describe, expect, it } from "vitest";
import { derive, graph } from "../engine";
import { classReport, CLASSMATES, simulatedClassmates, type Member } from "./classroom";
import { DEMO_STUDENT } from "./script";
import { simulate } from "./simulate";

const you = (): Member => {
  const r = simulate(DEMO_STUDENT);
  return {
    id: "you", name: "You", simulated: false, diagnosed: r.diagnosed, current: r.learner,
    rootGaps: r.rootGaps, uncertain: r.uncertain, rootDefeated: r.rootDefeated,
    transferVerified: r.transferVerified, needsTeacher: r.needsTeacher,
  };
};

describe("simulated class", () => {
  const mates = simulatedClassmates();
  const members = [...mates, you()];
  const report = classReport(members);

  it("diagnoses each classmate profile as designed", () => {
    const roots = Object.fromEntries(mates.map((m) => [m.id, m.rootGaps[0] ?? null]));
    expect(roots).toEqual({
      amara: "S3", dev: "S3", isla: "S3", kofi: "S3",
      ben: "S13", femi: "S13", hugo: "S13",
      chloe: "S16", jay: "S16",
      ella: "S10",
      grace: null,
    });
    expect(mates.every((m) => !m.uncertain)).toBe(true);
  });

  it("derives the distribution and recommendation from the engine, using the actual class size", () => {
    expect(report.classSize).toBe(CLASSMATES.length + 1);
    const total = report.distribution.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(report.struggling);
    // After the missions, 4 of the 5 students rooted at S3 repaired it, so the advice moves
    // on to what the class is weakest at now, and that skill is red on the heatmap.
    const rec = report.recommendation!;
    expect(rec.kind).toBe("now");
    if (rec.kind === "now") {
      expect(rec.fixedRoot).toBe("S3");
      expect(report.heatmap[rec.skill].weak).toBe(rec.weakNow);
      expect(Math.max(...Object.values(report.heatmap).filter((c) => c.skill !== "S17").map((c) => c.weak))).toBe(rec.weakNow);
    }
  });

  it("recommends the root gap while most of those students are still stuck", () => {
    const before = classReport(members.map((m) => ({ ...m, current: m.diagnosed, rootDefeated: false, transferVerified: false })));
    expect(before.recommendation).toEqual({ kind: "root", skill: "S3", target: "S17", affected: 5, stillStuck: 5, classSize: 12 });
  });

  it("heatmap shows the class now, consistent with repair outcomes", () => {
    // Of the 5 students whose root gap was S3, only Kofi's repair failed.
    expect(report.heatmap.S3.weak).toBe(1);
    for (const id of Object.keys(report.heatmap) as (keyof typeof report.heatmap)[]) {
      const weakNow = members.filter((m) => ["gap", "root_gap", "suspect"].includes(derive(graph, m.current).status[id])).length;
      expect(report.heatmap[id].weak).toBe(weakNow);
    }
  });

  it("raises a class-wide misconception only above 30%", () => {
    const negNeg = report.misconceptions.find((m) => m.misconception.id === "neg_times_neg_negative");
    const chose = members.filter((m) =>
      m.diagnosed.attempts.some((a) => a.phase === "quiz" && !a.correct && a.misconceptionId === "neg_times_neg_negative"),
    ).length;
    expect(negNeg?.students).toBe(chose);
    expect(negNeg?.classWide).toBe(true);
    for (const m of report.misconceptions) expect(m.classWide).toBe(m.share > 0.3);
  });

  it("class status counts add up to the class size", () => {
    const { strong, developing, needsSupport } = report.status;
    expect(strong + developing + needsSupport).toBe(report.classSize);
    // Grace never struggled; 9 transferred; Kofi and Hugo need support.
    expect(needsSupport).toBe(2);
  });

  it("computes repair outcomes from the same attempts", () => {
    expect(report.repair).toEqual({ started: 11, defeated: 9, transferred: 9, needsTeacher: 2 });
  });
});
