"use client";

import { useMemo } from "react";
import { classReport, CLASSMATES, simulatedClassmates, type Member } from "@/lib/demo/classroom";
import { ClassInsight } from "../teacher/ClassInsight";
import { Button } from "../ui";
import type { DemoOnlyProps } from "./types";

let cachedMates: Member[] | null = null;
const mates = () => (cachedMates ??= simulatedClassmates());

export function Teacher({ state, dispatch }: DemoOnlyProps) {
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

  return (
    <ClassInsight
      report={report}
      classLabel={`Simulated class: ${CLASSMATES.length} simulated classmates${state.diagnosed ? " + you" : ""}`}
      intro="Every number here is computed from the same engine attempts as your own run. No individual weaknesses are shown on this screen."
      actions={<Button variant="secondary" onClick={() => dispatch({ type: "goto", stage: "map" })}>Back to my map</Button>}
    />
  );
}
