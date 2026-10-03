/** Synthetic content for automated tests only. Never offered as generated course content. */
import type { Course } from "./schema";

export function learningFixture(): Course {
  const names = ["Coverage items", "Statement coverage", "Decision outcomes", "Coverage comparisons", "Selecting test suites"];
  const course: Course = {
    title: "Software testing fixture", objective: "Select tests and explain coverage", summary: "Synthetic content for testing the learning flow.", targetSkillId: "S5",
    skills: names.map((name, i) => ({
      id: `S${i + 1}` as Course["targetSkillId"], name, short: name, description: `Understand ${name.toLowerCase()}.`,
      source: { origin: "notes", reference: `Fixture section ${i + 1}`, excerpt: "Coverage counts exercised items." },
      prerequisites: i ? [{ skillId: `S${i}` as Course["targetSkillId"], reason: "Fixture dependency for tracing.", origin: "inferred" }] : [],
      lesson: { idea: "Identify the coverage item before calculating the fraction.", example: { prompt: "Three of four items are exercised.", steps: ["Divide exercised items by all items.", "3 / 4 = 75%."] }, mistake: "Counting tests rather than items.", selfCheck: "What is the denominator?" },
    })),
    questions: [], quizIds: [],
  };
  for (const skill of course.skills) {
    for (const kind of ["diagnostic", "check", "bridge", ...(skill.id === "S5" ? ["boss"] : [])] as const) {
      const count = kind === "diagnostic" || kind === "boss" ? 4 : kind === "check" ? 3 : 1;
      for (let i = 0; i < count; i++) course.questions.push({
        id: `${skill.id}-${kind}-${i}`, skillId: skill.id, kind: kind as Course["questions"][number]["kind"],
        text: `${skill.name}: fixture ${kind} scenario ${i + 1}, what does the coverage percentage describe?`,
        rationale: "Coverage measures the proportion of selected items exercised, rather than a guarantee of correctness.", source: skill.source,
        options: [
          { text: "The proportion of selected items exercised", correct: true, feedback: "Correct.", misconception: "none" },
          { text: "The absence of all defects", correct: false, feedback: "Coverage does not prove correctness.", misconception: "Coverage proves correctness" },
          { text: "The number of testers on the team", correct: false, feedback: "Count coverage items, not testers.", misconception: "Counting testers" },
          { text: "The project's total cost", correct: false, feedback: "Cost is not coverage.", misconception: "Confusing cost and coverage" },
        ],
      });
    }
  }
  course.quizIds = ["S1-diagnostic-0", "S2-diagnostic-0", "S3-diagnostic-0", "S4-diagnostic-0", "S5-diagnostic-0", "S1-diagnostic-1", "S2-diagnostic-1", "S3-diagnostic-1"];
  return course;
}
