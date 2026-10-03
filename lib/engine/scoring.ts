import type { Attempt } from "./types";

export const POINTS_FLOOR = -0.5;
export const HINT_PENALTY = 0.1;

/** points = result − m_before, minus 0.1 per hint, floored at −0.5. */
export function questionPoints(correct: boolean, mBefore: number, hintsUsed = 0): number {
  return Math.max(POINTS_FLOOR, (correct ? 1 : 0) - mBefore - HINT_PENALTY * hintsUsed);
}

/** improvement = Σ points ÷ n × 100, rounded. */
export function improvementScore(points: number[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((a, b) => a + b, 0);
  return Math.round((sum / points.length) * 100 + Number.EPSILON);
}

export type ScoredAttempt = { attempt: Attempt; expected: number; points: number };

/** Score a quiz: each question's expected value is the skill's mastery before this quiz. */
export function scoreQuiz(attempts: Attempt[]) {
  const scored: ScoredAttempt[] = attempts.map((a) => ({
    attempt: a,
    expected: a.baseline,
    points: questionPoints(a.correct, a.baseline, a.hintsUsed),
  }));
  const correct = attempts.filter((a) => a.correct).length;
  return {
    scored,
    correct,
    total: attempts.length,
    percent: attempts.length ? Math.round((correct / attempts.length) * 100) : 0,
    improvement: improvementScore(scored.map((s) => s.points)),
  };
}
