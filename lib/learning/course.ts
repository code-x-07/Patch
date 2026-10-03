import type { SkillId } from "../content/types";
import { courseInfo, type CourseDef } from "../course";
import { toBank, toSkills, type Course } from "./schema";

/** Turn a generated course into a playable course for the shared engine and screens. */
export function toCourseDef(c: Course): CourseDef {
  const info = courseInfo({ title: c.title, skills: toSkills(c), target: c.targetSkillId as SkillId, conceptual: true });
  const bank = toBank(c);
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  return { ...info, quiz: c.quizIds.map((id) => byId.get(id)!), bank, reserveRepair: true };
}
