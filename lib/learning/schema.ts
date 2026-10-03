import { z } from "zod";
import type { Question, Skill, SkillId } from "../content/types";
import type { ContentBank } from "../engine/bank";
import { ancestors, buildGraph } from "../engine/graph";

export const MIN_SKILLS = 8;
export const MAX_SKILLS = 12;
/** The prerequisite chain from the target must be at least this many skills long. */
export const MIN_CHAIN = 4;
export const QUIZ_LENGTH = 8;
/** Per skill: diagnostics feed the quiz and the trace; checks and a bridge feed the repair. */
export const PER_SKILL = { diagnostic: 3, check: 2, bridge: 1 } as const;
export const BOSS_COUNT = 4;

const text = z.string().trim().min(1).max(1800);
const ids = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12"] as const;
const id = z.enum(ids);
const source = z.object({
  origin: z.enum(["notes", "inferred"]),
  reference: text.describe("PDF page number or pasted-text section; inferred content must say inferred prerequisite."),
  excerpt: text.describe("Short supporting excerpt from the source, or why an inferred prerequisite is needed."),
});

const skillSchema = z.object({
  id,
  name: text,
  short: z.string().trim().min(1).max(28).describe("2-3 word map label, at most 20 characters."),
  description: text,
  source,
  prerequisites: z.array(z.object({ skillId: id, reason: text, origin: z.enum(["notes", "inferred"]) })).max(3),
  lesson: z.object({
    idea: text,
    example: z.object({ prompt: text, steps: z.array(text).min(1).max(5) }),
    mistake: text,
    selfCheck: text,
  }),
});

/** Step 1: the skill map (no questions). */
export const mapSchema = z.object({
  title: z.string().trim().min(1).max(60).describe("Short topic title, at most 6 words."),
  objective: text,
  targetSkillId: id,
  summary: text,
  skills: z.array(skillSchema).min(MIN_SKILLS).max(MAX_SKILLS),
});

export const questionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
  skillId: id,
  kind: z.enum(["diagnostic", "check", "bridge", "boss"]),
  text,
  rationale: text,
  reference: z.string().trim().min(1).max(200).describe("PDF page or section this question draws on."),
  options: z.array(z.object({
    text,
    correct: z.boolean(),
    feedback: text,
    misconception: z.string().trim().min(1).max(100).describe("A reusable misconception label for a wrong option; use none for the correct option."),
  })).length(4),
});

/** Step 2: questions for a group of skills. */
export const questionsSchema = z.object({ questions: z.array(questionSchema) });

export const courseSchema = mapSchema.extend({
  questions: z.array(questionSchema),
  quizIds: z.array(z.string()).length(QUIZ_LENGTH),
});

export type CourseMap = z.infer<typeof mapSchema>;
export type GeneratedQuestion = z.infer<typeof questionSchema>;
export type Course = z.infer<typeof courseSchema>;

/** Gemini's schema compiler can reject large bounded-string/array grammars.
 * Keep the response shape in its schema; enforce bounds with Zod afterwards. */
export function generationSchema(schema: object): object {
  const localChecks = new Set(["$schema", "minLength", "maxLength", "pattern", "minItems", "maxItems", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]);
  function simplify(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(simplify);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !localChecks.has(key)).map(([key, child]) => [key, simplify(child)]));
    return value;
  }
  return simplify(schema) as object;
}

const mapSkills = (m: CourseMap): Skill[] =>
  m.skills.map((s) => ({ ...s, prereqs: s.prerequisites.map((p) => p.skillId as SkillId) }));

/** Longest prerequisite chain under the target, counted in skills (target included). */
export function chainLength(m: CourseMap): number {
  const graph = buildGraph(mapSkills(m));
  const memo = new Map<SkillId, number>();
  const depth = (s: SkillId): number => {
    if (!memo.has(s)) memo.set(s, 1 + Math.max(0, ...graph.prereqs[s].map(depth)));
    return memo.get(s)!;
  };
  return depth(m.targetSkillId as SkillId);
}

/**
 * Tidy a drafted map before validation: drop links to skills that don't exist
 * and skills that don't lead to the target. Nothing is invented; unsupported
 * parts are simply left out. Depth and size are still validated afterwards.
 */
export function pruneMap(input: unknown): unknown {
  const parsed = mapSchema.safeParse(input);
  if (!parsed.success) return input;
  const m = parsed.data;
  const ids = new Set(m.skills.map((s) => s.id));
  const skills = m.skills.map((s) => ({ ...s, prerequisites: s.prerequisites.filter((p) => ids.has(p.skillId) && p.skillId !== s.id) }));
  const byId = new Map<string, (typeof skills)[number]>(skills.map((s) => [s.id, s]));
  const keep = new Set<string>();
  const visit = (id: string) => {
    if (keep.has(id) || !byId.has(id)) return;
    keep.add(id);
    for (const p of byId.get(id)!.prerequisites) visit(p.skillId);
  };
  visit(m.targetSkillId);
  return { ...m, skills: skills.filter((s) => keep.has(s.id)) };
}

/** Structural checks on the skill map: ids, a connected tree under the target, real depth. */
export function validateMap(input: unknown): CourseMap {
  const m = mapSchema.parse(input);
  const skills = new Set(m.skills.map((s) => s.id));
  if (skills.size !== m.skills.length) throw new Error("Duplicate skill IDs.");
  if (!skills.has(m.targetSkillId)) throw new Error("The target skill is missing.");
  for (const skill of m.skills) {
    if (new Set(skill.prerequisites.map((p) => p.skillId)).size !== skill.prerequisites.length) throw new Error(`${skill.id}: duplicate prerequisite links.`);
    if (skill.prerequisites.some((p) => !skills.has(p.skillId))) throw new Error(`${skill.id}: prerequisite is not one of the skills.`);
  }
  const graph = buildGraph(mapSkills(m)); // throws on cycles
  const scope = ancestors(graph, m.targetSkillId);
  scope.add(m.targetSkillId);
  if (scope.size !== skills.size) throw new Error("Every skill must be a prerequisite (direct or indirect) of the target.");
  if (m.skills.find((s) => s.id === m.targetSkillId)?.source.origin !== "notes") throw new Error("The target must come from the notes.");
  if (chainLength(m) < MIN_CHAIN) throw new Error(`The prerequisite chain under the target is too shallow: trace back at least ${MIN_CHAIN} levels to foundations.`);
  return m;
}

/**
 * The 8-question quiz, chosen in code: one diagnostic for each skill nearest the
 * target first (breadth-first), so the quiz stays on the objective and every
 * skill keeps fresh diagnostics for tracing.
 */
export function chooseQuiz(m: CourseMap, questions: GeneratedQuestion[]): string[] {
  const graph = buildGraph(mapSkills(m));
  const order: SkillId[] = [];
  const queue: SkillId[] = [m.targetSkillId as SkillId];
  while (queue.length) {
    const s = queue.shift()!;
    if (order.includes(s)) continue;
    order.push(s);
    queue.push(...graph.prereqs[s]);
  }
  const diag = (s: SkillId) => questions.filter((q) => q.skillId === s && q.kind === "diagnostic").map((q) => q.id);
  const quiz: string[] = [];
  for (let round = 0; quiz.length < QUIZ_LENGTH && round < PER_SKILL.diagnostic - 1; round++) {
    for (const s of order) {
      const q = diag(s)[round];
      if (q && quiz.length < QUIZ_LENGTH) quiz.push(q);
    }
  }
  return quiz;
}

/**
 * Drop individual questions that break the rules (not exactly one correct
 * answer, repeated choices, wrong choices without a misconception, repeated
 * text). Counts are checked afterwards, so a skill left short gets regenerated.
 */
export function keepValidQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const seen = new Set<string>();
  return questions.filter((q) => {
    const text = norm(q.text);
    const ok =
      q.options.filter((o) => o.correct).length === 1 &&
      new Set(q.options.map((o) => norm(o.text))).size === 4 &&
      !q.options.some((o) => !o.correct && o.misconception.toLowerCase() === "none") &&
      !seen.has(text);
    if (ok) seen.add(text);
    return ok;
  });
}

/** Structural checks on the whole course. Separate from the AI content review; neither is a teacher endorsement. */
export function validateCourse(input: unknown): Course {
  const course = courseSchema.parse(input);
  validateMap(course);
  const skills = new Set(course.skills.map((s) => s.id));
  const questions = new Map(course.questions.map((q) => [q.id, q]));
  if (questions.size !== course.questions.length) throw new Error("Duplicate question IDs.");
  const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  if (new Set(course.questions.map((q) => normalized(q.text))).size !== questions.size) throw new Error("Repeated question text.");
  for (const q of course.questions) {
    if (!skills.has(q.skillId)) throw new Error(`${q.id}: unknown skill.`);
    if (q.options.filter((o) => o.correct).length !== 1) throw new Error(`${q.id}: needs exactly one correct answer.`);
    if (new Set(q.options.map((o) => normalized(o.text))).size !== 4) throw new Error(`${q.id}: duplicate choices.`);
    if (q.options.some((o) => !o.correct && o.misconception.toLowerCase() === "none")) throw new Error(`${q.id}: wrong choices need a misconception label.`);
  }
  for (const skill of course.skills) {
    const qs = course.questions.filter((q) => q.skillId === skill.id);
    for (const kind of ["diagnostic", "check", "bridge"] as const) {
      if (qs.filter((q) => q.kind === kind).length < PER_SKILL[kind]) throw new Error(`${skill.id}: needs ${PER_SKILL[kind]} ${kind} questions.`);
    }
  }
  if (course.questions.filter((q) => q.skillId === course.targetSkillId && q.kind === "boss").length < BOSS_COUNT) throw new Error(`The target needs ${BOSS_COUNT} Boss Fight questions.`);
  if (new Set(course.quizIds).size !== QUIZ_LENGTH) throw new Error("The quiz needs eight distinct questions.");
  const quiz = course.quizIds.map((qid) => questions.get(qid));
  if (quiz.some((q) => !q || q.kind !== "diagnostic")) throw new Error("The quiz must use diagnostic questions.");
  if (!quiz.some((q) => q!.skillId === course.targetSkillId)) throw new Error("The quiz must test the target.");
  for (const skill of course.skills) {
    const unused = course.questions.filter((q) => q.skillId === skill.id && q.kind === "diagnostic" && !course.quizIds.includes(q.id));
    if (unused.length < 2) throw new Error(`${skill.id}: needs two diagnostics left for tracing.`);
  }
  return course;
}

export function toSkills(course: CourseMap): Skill[] {
  return mapSkills(course);
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
