import { skills } from "../content/skills";
import { buildGraph } from "./graph";

export * from "./types";
export * from "./graph";
export * from "./evidence";
export * from "./mastery";
export * from "./scoring";
export * from "./learner";
export * from "./diagnose";
export * from "./mission";

/** The demo algebra graph, validated (throws on cycles or missing prerequisites). */
export const graph = buildGraph(skills);
