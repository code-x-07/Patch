import { z } from "zod";
import type { Question, Skill, SkillId } from "../content/types";
import { ancestors, buildGraph } from "../engine/graph";
import type { ContentBank } from "../engine/learner";

const text = z.string().trim().min(1).max(1800);
const id = z.enum(["S1", "S2", "S3", "S4", "S5", "S6", "S7"]);
const source = z.object({
  origin: z.enum(["notes", "inferred"]),
  reference: text.describe("PDF page number or pasted-text section; inferred content must say inferred prerequisite."),
  excerpt: text.describe("Short supporting excerpt from the source, or explanation of an inferred prerequisite."),
});

export const courseSchema = z.object({
  title: text,
  objective: text,
  targetSkillId: id,
  summary: text,
  skills: z.array(z.object({
    id, name: text, short: z.string().trim().min(1).max(45), description: text,
    source,
    prerequisites: z.array(z.object({ skillId: id, reason: text, origin: z.enum(["notes", "inferred"]) })).max(4),
    lesson: z.object({
      idea: text,
      example: z.object({ prompt: text, steps: z.array(text).min(1).max(6) }),
      mistake: text, selfCheck: text,
    }),
  })).min(4).max(7),
  questions: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), skillId: id,
    kind: z.enum(["diagnostic", "check", "bridge", "boss"]),
    text, rationale: text, source,
    options: z.array(z.object({
      text, correct: z.boolean(), feedback: text,
      misconception: z.string().trim().min(1).max(100).describe("A reusable misconception label for a wrong option; use none for the correct option."),
    })).length(4),
  })).min(36).max(70),
  quizIds: z.array(z.string()).length(8),
});

export type Course = z.infer<typeof courseSchema>;

/** Structural checks are separate from Gemini's content review. Neither is a teacher endorsement. */
export function validateCourse(input: unknown): Course {
  const course = courseSchema.parse(input);
  const skills = new Set(course.skills.map((s) => s.id));
  if (skills.size !== course.skills.length) throw new Error("Duplicate skill IDs.");
  if (!skills.has(course.targetSkillId)) throw new Error("Missing target skill.");
  for (const skill of course.skills) {
    if (new Set(skill.prerequisites.map((p) => p.skillId)).size !== skill.prerequisites.length) throw new Error("Duplicate prerequisite links.");
  }
  const graph = buildGraph(toSkills(course));
  const scope = ancestors(graph, course.targetSkillId);
  scope.add(course.targetSkillId);
  if (scope.size !== skills.size) throw new Error("Every skill must support the chosen target.");
  if (course.skills.find((s) => s.id === course.targetSkillId)?.source.origin !== "notes") throw new Error("The learning target must come from the notes.");
  const questions = new Map(course.questions.map((q) => [q.id, q]));
  if (questions.size !== course.questions.length) throw new Error("Duplicate question IDs.");
  const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  if (new Set(course.questions.map((q) => normalized(q.text))).size !== questions.size) throw new Error("Repeated question text.");
  for (const q of course.questions) {
    if (!skills.has(q.skillId)) throw new Error("Question references an unknown skill.");
    if (q.options.filter((o) => o.correct).length !== 1) throw new Error("Each question needs exactly one correct answer.");
    if (new Set(q.options.map((o) => normalized(o.text))).size !== 4) throw new Error("Question contains duplicate choices.");
    if (q.options.some((o) => !o.correct && o.misconception.toLowerCase() === "none")) throw new Error("Wrong choices need misconception feedback.");
  }
  if (new Set(course.quizIds).size !== 8) throw new Error("Quiz must have eight distinct questions.");
  const quiz = course.quizIds.map((qid) => questions.get(qid));
  if (quiz.some((q) => !q || q.kind !== "diagnostic")) throw new Error("Quiz references missing or non-diagnostic questions.");
  if (new Set(quiz.map((q) => q!.skillId)).size !== skills.size) throw new Error("Quiz must sample every skill.");
  if (!quiz.some((q) => q!.skillId === course.targetSkillId)) throw new Error("Quiz must test the learning target.");
  for (const skill of course.skills) {
    const qs = course.questions.filter((q) => q.skillId === skill.id);
    if (qs.filter((q) => q.kind === "diagnostic" && !course.quizIds.includes(q.id)).length < 2) throw new Error(`${skill.name}: needs two unused diagnostic questions.`);
    if (qs.filter((q) => q.kind === "check").length < 3) throw new Error(`${skill.name}: needs three repair checks.`);
    if (!qs.some((q) => q.kind === "bridge")) throw new Error(`${skill.name}: needs a bridge question.`);
  }
  if (course.questions.filter((q) => q.skillId === course.targetSkillId && q.kind === "boss").length < 4) throw new Error("Target needs four distinct Boss Fight questions.");
  return course;
}

export function toSkills(course: Course): Skill[] {
  return course.skills.map((s) => ({ ...s, prereqs: s.prerequisites.map((p) => p.skillId as SkillId) }));
}

export function toBank(course: Course): ContentBank {
  const misconceptions: ContentBank["misconceptions"] = {};
  const questions: Question[] = course.questions.map((q) => ({
    id: q.id, skillId: q.skillId, kind: q.kind, tier: 2,
    text: q.text,
    verify: { type: "conceptual", rationale: q.rationale },
    options: q.options.map((o) => {
      const misconceptionId = `${q.skillId}:${o.misconception.toLowerCase()}`;
      if (!o.correct) misconceptions[misconceptionId] ??= { id: misconceptionId, label: o.misconception, message: o.feedback, explain: q.rationale };
      return { text: o.text, correct: o.correct, message: o.feedback, ...(!o.correct ? { misconceptionId } : {}) };
    }),
  }));
  return { questions, misconceptions };
}
