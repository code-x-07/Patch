import { skills } from "../content/skills";
import { buildGraph } from "./graph";

/** The demo algebra graph, validated at load (throws on cycles or missing prerequisites). */
export const skillGraph = buildGraph(skills);
