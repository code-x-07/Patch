"use client";

import { useMemo } from "react";
import type { Member } from "@/lib/demo/classroom";
import { ClassInsight } from "../teacher/ClassInsight";
import { Button } from "../ui";
import type { DemoOnlyProps } from "./types";

let cachedMates: Member[] | null = null;

export function Teacher({ state, dispatch, runtime }: DemoOnlyProps) {
  const { classReport, CLASSMATES, simulatedClassmates } = runtime;
  const mates = () => (cachedMates ??= simulatedClassmates());
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runtime functions are stable module exports
  }, [state.diagnosed, state.learner, state.diagnosis, state.result]);

  return (
    <ClassInsight
      report={report}
      classLabel={`Simulated class: ${CLASSMATES.length} simulated classmates${state.diagnosed ? " + you" : ""}`}
      actions={<Button variant="secondary" onClick={() => dispatch({ type: "goto", stage: "map" })}>Back to my map</Button>}
    />
  );
}
