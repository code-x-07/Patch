import type { SkillId } from "./types";

/**
 * Knowledge Map layout in a 440 × 630 viewBox, on a 5-column grid. Positions
 * come from a small optimiser (prerequisites always below what they unlock,
 * crossings and lines near other skills minimised). The demo's root-gap trace
 * runs up a straight spine at x = 220: S4 → S2 → S3 → S8 → S9 → S10 → S13 → S17.
 * One crossing (S9→S12 with S11→S13) is unavoidable with that spine.
 */
export const MAP_W = 440;
export const MAP_H = 630;

export const layout: Record<SkillId, { x: number; y: number }> = {
  S17: { x: 220, y: 42 },
  S16: { x: 135, y: 118 },
  S13: { x: 220, y: 118 },
  S12: { x: 305, y: 118 },
  S14: { x: 135, y: 194 },
  S10: { x: 220, y: 194 },
  S11: { x: 305, y: 194 },
  S19: { x: 390, y: 194 },
  S1: { x: 50, y: 270 },
  S9: { x: 220, y: 270 },
  S18: { x: 305, y: 270 },
  S7: { x: 135, y: 346 },
  S8: { x: 220, y: 346 },
  S6: { x: 305, y: 346 },
  S15: { x: 50, y: 422 },
  S3: { x: 220, y: 422 },
  S5: { x: 390, y: 422 },
  S2: { x: 220, y: 498 },
  S4: { x: 220, y: 574 },
};

/** Split a short label into at most two lines, so neighbours in a row never touch. */
export function labelLines(label: string): string[] {
  if (label.length <= 9 || !label.includes(" ")) return [label];
  const words = label.split(" ");
  let best: [string, string] = [label, ""];
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const score = Math.max(a.length, b.length);
    if (score < bestScore) { best = [a, b]; bestScore = score; }
  }
  return best[1] ? best : [best[0]];
}
