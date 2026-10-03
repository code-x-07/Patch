/** Synthetic content for automated tests only. Never offered as generated course content. */
import { BOSS_COUNT, chooseQuiz, PER_SKILL, type Course, type CourseMap, type GeneratedQuestion } from "./schema";

type Id = Course["targetSkillId"];

// A deep tree: S8 (target) ← S7 ← S6 ← S5 ← S4 ← S2 ← S1, with S3 → S4 and S1 → S6 side branches.
const SKILLS: { id: Id; name: string; prereqs: Id[] }[] = [
  { id: "S1", name: "Counting outcomes", prereqs: [] },
  { id: "S2", name: "Coverage items", prereqs: ["S1"] },
  { id: "S3", name: "Control flow graphs", prereqs: [] },
  { id: "S4", name: "Statement coverage", prereqs: ["S2", "S3"] },
  { id: "S5", name: "Decision outcomes", prereqs: ["S4"] },
  { id: "S6", name: "Decision coverage", prereqs: ["S5", "S1"] },
  { id: "S7", name: "Coverage comparisons", prereqs: ["S6"] },
  { id: "S8", name: "Selecting test suites", prereqs: ["S7"] },
];

export function learningFixture(): Course {
  const map: CourseMap = {
    title: "Software testing fixture",
    objective: "Select tests and explain coverage",
    summary: "Synthetic content for testing the learning flow.",
    targetSkillId: "S8",
    skills: SKILLS.map((s) => ({
      id: s.id,
      name: s.name,
      short: s.name,
      description: `Understand ${s.name.toLowerCase()}.`,
      source: { origin: "notes", reference: `Fixture section ${s.id}`, excerpt: "Coverage counts exercised items." },
      prerequisites: s.prereqs.map((p) => ({ skillId: p, reason: "Fixture dependency for tracing.", origin: "inferred" as const })),
      lesson: {
        idea: "Identify the coverage item before calculating the fraction.",
        example: { prompt: "Three of four items are exercised.", steps: ["Divide exercised items by all items.", "3 / 4 = 75%."] },
        mistake: "Counting tests rather than items.",
        selfCheck: "What is the denominator?",
      },
    })),
  };
  const questions: GeneratedQuestion[] = [];
  for (const skill of SKILLS) {
    const counts: [GeneratedQuestion["kind"], number][] = [
      ["diagnostic", PER_SKILL.diagnostic],
      ["check", PER_SKILL.check],
      ["bridge", PER_SKILL.bridge],
      ...(skill.id === map.targetSkillId ? [["boss", BOSS_COUNT] as [GeneratedQuestion["kind"], number]] : []),
    ];
    for (const [kind, count] of counts) {
      for (let i = 0; i < count; i++) {
        questions.push({
          id: `${skill.id}-${kind}-${i}`,
          skillId: skill.id,
          kind,
          text: `${skill.name}: fixture ${kind} scenario ${i + 1}, what does the coverage percentage describe?`,
          rationale: "Coverage measures the proportion of selected items exercised, not correctness.",
          reference: `Fixture section ${skill.id}`,
          options: [
            { text: "The proportion of selected items exercised", correct: true, feedback: "Correct.", misconception: "none" },
            { text: "The absence of all defects", correct: false, feedback: "Coverage does not prove correctness.", misconception: "Coverage proves correctness" },
            { text: "The number of testers on the team", correct: false, feedback: "Count coverage items, not testers.", misconception: "Counting testers" },
            { text: "The project's total cost", correct: false, feedback: "Cost is not coverage.", misconception: "Confusing cost and coverage" },
          ],
        });
      }
    }
  }
  return { ...map, questions, quizIds: chooseQuiz(map, questions) };
}
