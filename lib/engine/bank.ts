import type { Misconception, Question } from "../content/types";

/** A set of questions and misconceptions the engine draws from. */
export type ContentBank = {
  questions: Question[];
  misconceptions: Record<string, Misconception>;
};

// The engine imports no question bank itself, so code that only uses the engine
// with its own bank (AI sessions) never bundles the demo's answer key. The demo
// registers its bank once, in demoBank.ts (imported by the engine index).
let fallback: ContentBank | null = null;

export function registerDefaultBank(bank: ContentBank) {
  fallback = bank;
}

export function resolveBank(bank?: ContentBank): ContentBank {
  const b = bank ?? fallback;
  if (!b) throw new Error("No content bank: pass one, or import the engine index to use the demo bank.");
  return b;
}
