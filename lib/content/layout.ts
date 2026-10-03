import type { SkillId } from "./types";

/**
 * Hand-tuned Knowledge Map layout in a 400 × 620 viewBox. Prerequisites sit
 * below what they unlock. The demo's root-gap trace runs up a clean vertical
 * spine at x = 200: S4 → S2 → S3 → S8 → S9 → S10 → S13, then S17.
 */
export const MAP_W = 400;
export const MAP_H = 620;

export const layout: Record<SkillId, { x: number; y: number }> = {
  S17: { x: 150, y: 42 },
  S13: { x: 200, y: 112 },
  S12: { x: 338, y: 112 },
  S16: { x: 62, y: 150 },
  S10: { x: 200, y: 186 },
  S11: { x: 296, y: 222 },
  S14: { x: 62, y: 256 },
  S9: { x: 200, y: 260 },
  S19: { x: 360, y: 268 },
  S7: { x: 116, y: 330 },
  S8: { x: 200, y: 334 },
  S6: { x: 284, y: 336 },
  S18: { x: 360, y: 362 },
  S15: { x: 46, y: 378 },
  S3: { x: 200, y: 408 },
  S5: { x: 300, y: 432 },
  S1: { x: 108, y: 470 },
  S2: { x: 200, y: 486 },
  S4: { x: 200, y: 566 },
};

/** Split a short label into at most two lines of ~13 characters. */
export function labelLines(label: string): string[] {
  if (label.length <= 13) return [label];
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
