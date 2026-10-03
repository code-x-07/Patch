import { TARGET_SKILL } from "./content/skills";
import type { SkillId } from "./content/types";
import { ancestors } from "./engine/graph";
import { skillGraph } from "./engine/skillGraph";

/** Skills that could explain a miss on the target: the target and all its prerequisites. Client-safe. */
export const TARGET_SCOPE: ReadonlySet<SkillId> = new Set<SkillId>([TARGET_SKILL, ...ancestors(skillGraph, TARGET_SKILL)]);
