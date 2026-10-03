import { describe, expect, it } from "vitest";
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
    expect(report.recommendation).toEqual({ root: "S3", target: "S17", affected: 5, classSize: 12 });
  });

  it("matches heatmap counts to each member's verified diagnosis", () => {
    expect(report.heatmap.S3.weak).toBe(5);
    expect(report.heatmap.S13.weak).toBe(report.distribution.reduce((s, d) => s + d.count, 0) - 2);
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
