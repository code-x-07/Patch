import type { Dispatch } from "react";
import type { SkillId } from "@/lib/content/types";
import type { Action, DemoState } from "@/lib/demo/flow";
import type { Derived, Status } from "@/lib/engine";

export type StageProps = {
  state: DemoState;
  dispatch: Dispatch<Action>;
  derived: Derived;
  status: Record<SkillId, Status>;
  /** Show the scripted student's choices. */
  follow: boolean;
};
