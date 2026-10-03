import type { Skill, SkillId } from "./types";

export const SUBJECT = "Algebra";
export const TARGET_SKILL: SkillId = "S17";
export const OBJECTIVE_NAME = "Quadratic equations";

export const skills: Skill[] = [
  {
    id: "S1", name: "Fractions basics", short: "Fractions", prereqs: [],
    description: "Add, subtract and multiply simple fractions.",
    lesson: {
      idea: "To add or subtract fractions, the pieces must be the same size first. Rewrite them with a common denominator, then combine the numerators only.",
      example: { prompt: "1/2 + 1/3", steps: ["Common denominator: 6", "1/2 = 3/6 and 1/3 = 2/6", "3/6 + 2/6 = 5/6"] },
      mistake: "Adding the tops and the bottoms: 1/2 + 1/3 is not 2/5.",
      selfCheck: "Is 3/4 − 1/2 equal to 1/4?",
    },
  },
  {
    id: "S4", name: "Negative numbers on the number line", short: "Number line", prereqs: [],
    description: "Order negative numbers and move along the number line.",
    lesson: {
      idea: "On a number line, left is smaller and right is bigger. Negative numbers sit left of zero, and the further left, the smaller they are.",
      example: { prompt: "What is 5 to the left of 2?", steps: ["Start at 2", "Count 5 steps left: 1, 0, −1, −2, −3", "Answer: −3"] },
      mistake: "Thinking −8 is bigger than −2 because 8 is bigger than 2.",
      selfCheck: "Which is smaller, −1 or −9?",
    },
  },
  {
    id: "S11", name: "Factors and multiples", short: "Factors", prereqs: [],
    description: "Find factors, common factors and factor pairs.",
    lesson: {
      idea: "A factor divides a number exactly. Factor pairs multiply to the number, and looking for pairs is the key move in factorising.",
      example: { prompt: "Which two numbers multiply to 12 and add to 7?", steps: ["Factor pairs of 12: 1 & 12, 2 & 6, 3 & 4", "Sums: 13, 8, 7", "Answer: 3 and 4"] },
      mistake: "Stopping at the first pair with the right product without checking the sum.",
      selfCheck: "What is the highest common factor of 12 and 18?",
    },
  },
  {
    id: "S2", name: "Adding and subtracting integers", short: "Adding integers", prereqs: ["S4"],
    description: "Add and subtract positive and negative whole numbers.",
    lesson: {
      idea: "Adding moves right on the number line; subtracting moves left. Subtracting a negative is the same as adding.",
      example: { prompt: "5 − (−4)", steps: ["Subtracting a negative means adding", "5 + 4", "Answer: 9"] },
      mistake: "Treating 5 − (−4) as 5 − 4.",
      selfCheck: "What is −7 + 3?",
    },
  },
  {
    id: "S3", name: "Multiplying and dividing integers (including negatives)", short: "Multiplying negatives", prereqs: ["S2"],
    description: "Multiply and divide positive and negative whole numbers using the sign rules.",
    lesson: {
      idea: "Multiply or divide the sizes first, then decide the sign. Same signs give a positive answer. Different signs give a negative answer.",
      signGrid: true,
      example: { prompt: "(−3) × (−4)", steps: ["Sizes: 3 × 4 = 12", "Signs: negative × negative → same signs", "Answer: +12"] },
      mistake: "Keeping the negative sign when both numbers are negative.",
      selfCheck: "What is (−2) × (−2) × (−2)? Count the negatives.",
    },
  },
  {
    id: "S5", name: "Order of operations", short: "Order of operations", prereqs: ["S2"],
    description: "Brackets, powers, multiply and divide, then add and subtract.",
    lesson: {
      idea: "Work in this order: brackets, powers, then × and ÷, then + and −.",
      example: { prompt: "3 + 4 × 2", steps: ["Multiply first: 4 × 2 = 8", "Then add: 3 + 8", "Answer: 11"] },
      mistake: "Working left to right: (3 + 4) × 2 = 14.",
      selfCheck: "What is 20 − 6 ÷ 2?",
    },
  },
  {
    id: "S7", name: "Collecting like terms", short: "Like terms", prereqs: ["S2"],
    description: "Combine x terms with x terms and numbers with numbers.",
    lesson: {
      idea: "Only like terms combine. Each term keeps the sign in front of it.",
      example: { prompt: "3x + 5 − x + 2", steps: ["x terms: 3x − x = 2x", "Numbers: 5 + 2 = 7", "Answer: 2x + 7"] },
      mistake: "Combining 2x + 7 into 9x.",
      selfCheck: "Simplify 5x − 2 − 3x − 4.",
    },
  },
  {
    id: "S15", name: "Inverse operations and moving terms", short: "Inverse operations", prereqs: ["S2"],
    description: "Undo operations by doing the opposite to both sides.",
    lesson: {
      idea: "To undo an operation, do its inverse to both sides: + undoes −, × undoes ÷.",
      example: { prompt: "x + 7 = 3", steps: ["Undo + 7: subtract 7 from both sides", "x = 3 − 7", "x = −4"] },
      mistake: "Adding 7 instead of subtracting it.",
      selfCheck: "Solve x − 5 = −2.",
    },
  },
  {
    id: "S6", name: "Substituting values into expressions", short: "Substitution", prereqs: ["S5", "S3"],
    description: "Replace letters with numbers and evaluate.",
    lesson: {
      idea: "Put each value in brackets when you substitute, especially negatives. Then follow the order of operations.",
      example: { prompt: "3x + 5 when x = −2", steps: ["3 × (−2) + 5", "−6 + 5", "Answer: −1"] },
      mistake: "Writing −3² instead of (−3)², which loses the sign.",
      selfCheck: "If x = −3, what is x²?",
    },
  },
  {
    id: "S14", name: "Solving linear equations", short: "Linear equations", prereqs: ["S15", "S7", "S1"],
    description: "Solve equations like 2x + 3 = 11.",
    lesson: {
      idea: "Get the x terms on one side and the numbers on the other, using inverse operations. Then divide.",
      example: { prompt: "2x + 3 = 11", steps: ["Subtract 3: 2x = 8", "Divide by 2", "x = 4"] },
      mistake: "Moving a term across the equals sign without changing its sign.",
      selfCheck: "Solve 7 − 2x = 1.",
    },
  },
  {
    id: "S8", name: "The distributive law", short: "Distributive law", prereqs: ["S3"],
    description: "a(b + c) = ab + ac.",
    lesson: {
      idea: "The number outside a bracket multiplies every term inside, sign included.",
      example: { prompt: "3(x − 4)", steps: ["3 × x = 3x", "3 × (−4) = −12", "Answer: 3x − 12"] },
      mistake: "Multiplying only the first term: 3(x − 4) is not 3x − 4.",
      selfCheck: "Expand −4(x + 2).",
    },
  },
  {
    id: "S18", name: "Squares and square roots", short: "Squares & roots", prereqs: ["S3"],
    description: "Square numbers, including negatives, and find square roots.",
    lesson: {
      idea: "Squaring multiplies a number by itself, so the square of a negative is positive. A square root undoes squaring.",
      example: { prompt: "(−6)²", steps: ["(−6) × (−6)", "Same signs → positive", "Answer: 36"] },
      mistake: "Thinking (−6)² = −36.",
      selfCheck: "What is √81?",
    },
  },
  {
    id: "S9", name: "Expanding single brackets", short: "Single brackets", prereqs: ["S8", "S7"],
    description: "Expand and simplify expressions like −2(x − 3) + x.",
    lesson: {
      idea: "Expand every term, carrying signs, then collect like terms.",
      example: { prompt: "−2(x − 3)", steps: ["−2 × x = −2x", "−2 × (−3) = +6", "Answer: −2x + 6"] },
      mistake: "Writing −2 × (−3) as −6.",
      selfCheck: "Expand −(x − 7).",
    },
  },
  {
    id: "S16", name: "Zero product property", short: "Zero product", prereqs: ["S14"],
    description: "If A × B = 0, then A = 0 or B = 0.",
    lesson: {
      idea: "If two things multiply to make zero, at least one of them must be zero. Set each bracket to zero and solve.",
      example: { prompt: "(x − 4)(x + 1) = 0", steps: ["x − 4 = 0 → x = 4", "x + 1 = 0 → x = −1", "x = 4 or x = −1"] },
      mistake: "Taking the bracket numbers as the answers: x = −4 or x = 1.",
      selfCheck: "Solve x(x − 6) = 0.",
    },
  },
  {
    id: "S19", name: "The quadratic formula", short: "Quadratic formula", prereqs: ["S6", "S18", "S5"],
    description: "x = (−b ± √(b² − 4ac)) ÷ 2a.",
    lesson: {
      idea: "Any quadratic ax² + bx + c = 0 can be solved with x = (−b ± √(b² − 4ac)) ÷ 2a. Bracket every value you substitute.",
      example: { prompt: "x² − 2x − 3 = 0", steps: ["a = 1, b = −2, c = −3", "b² − 4ac = 4 + 12 = 16", "x = (2 ± 4) ÷ 2 → x = 3 or x = −1"] },
      mistake: "Sign errors in b² − 4ac when c is negative.",
      selfCheck: "For x² + 3x − 4 = 0, what is b² − 4ac?",
    },
  },
  {
    id: "S10", name: "Expanding double brackets", short: "Double brackets", prereqs: ["S9"],
    description: "Expand (x + a)(x + b).",
    lesson: {
      idea: "Multiply every term in the first bracket by every term in the second, then collect the middle terms.",
      example: { prompt: "(x + 2)(x − 5)", steps: ["x² − 5x + 2x − 10", "Middle terms: −5x + 2x = −3x", "Answer: x² − 3x − 10"] },
      mistake: "Getting +10 instead of −10: +2 × −5 is negative.",
      selfCheck: "Expand (x − 3)(x − 4).",
    },
  },
  {
    id: "S12", name: "Factorising by common factor", short: "Common factor", prereqs: ["S11", "S9"],
    description: "Take out the highest common factor.",
    lesson: {
      idea: "Factorising reverses expanding. Find the highest factor shared by every term and divide each term by it.",
      example: { prompt: "6x + 9", steps: ["HCF of 6x and 9 is 3", "6x ÷ 3 = 2x and 9 ÷ 3 = 3", "Answer: 3(2x + 3)"] },
      mistake: "Dividing only the first term by the factor.",
      selfCheck: "Factorise 4x − 12.",
    },
  },
  {
    id: "S13", name: "Factorising quadratics (x^2 + bx + c)", short: "Factorising quadratics", prereqs: ["S10", "S11"],
    description: "Write x² + bx + c as (x + p)(x + q).",
    lesson: {
      idea: "Find two numbers that multiply to c and add to b, signs included. Then check by expanding.",
      example: { prompt: "x² + 2x − 15", steps: ["Multiply to −15, add to +2", "+5 and −3", "Answer: (x + 5)(x − 3)"] },
      mistake: "Swapping the signs: (x − 5)(x + 3) gives −2x.",
      selfCheck: "Factorise x² − 5x + 6.",
    },
  },
  {
    id: "S17", name: "Solving quadratics by factorisation", short: "Solving quadratics", prereqs: ["S13", "S16"],
    description: "Solve x² + bx + c = 0 by factorising.",
    lesson: {
      idea: "Factorise, then set each bracket to zero. The solutions have the opposite sign to the bracket numbers.",
      example: { prompt: "x² + x − 6 = 0", steps: ["(x + 3)(x − 2) = 0", "x + 3 = 0 or x − 2 = 0", "x = −3 or x = 2"] },
      mistake: "Taking the bracket numbers as the solutions: x = 3 or x = −2.",
      selfCheck: "Solve x² − x − 12 = 0.",
    },
  },
];

export const skillById: Record<SkillId, Skill> = Object.fromEntries(
  skills.map((s) => [s.id, s]),
) as Record<SkillId, Skill>;

/** Canonical display name, resolved in one place. */
export function skillName(id: SkillId): string {
  return skillById[id].name;
}
