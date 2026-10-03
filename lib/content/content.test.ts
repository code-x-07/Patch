import { describe, expect, it } from "vitest";
import { algebraToJs, questions, skills, validateContent, type Question } from ".";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);

function evalNum(expr: string): number {
  return new Function("gcd", "lcm", `return (${expr});`)(gcd, lcm) as number;
}
function evalIn(expr: string, x: number): number {
  return new Function("x", `return (${algebraToJs(expr)});`)(x) as number;
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const SAMPLES = [-2.5, -1, 0.5, 2, 3.7];
const samePoly = (a: string, b: string) => SAMPLES.every((x) => close(evalIn(a, x), evalIn(b, x)));

function parseRoots(text: string): number[] {
  return text.split(" or ").map((part) => evalNum(algebraToJs(part.split("=")[1].trim())));
}
function trueRoots(expr: string): number[] {
  // Scan for sign changes / zeros on a fine grid, then refine by bisection.
  const f = (x: number) => evalIn(expr, x);
  const found: number[] = [];
  for (let x = -30; x < 30; x += 0.25) {
    const a = f(x), b = f(x + 0.25);
    if (close(a, 0)) found.push(x);
    else if (a * b < 0) {
      let lo = x, hi = x + 0.25;
      for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
      found.push((lo + hi) / 2);
    }
  }
  return found;
}
const sameSet = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v) => b.some((u) => close(u, v))) && b.every((v) => a.some((u) => close(u, v)));

function isCorrect(q: Question, optionText: string): boolean {
  const v = q.verify;
  switch (v.type) {
    case "num":
      return close(evalNum(algebraToJs(optionText)), evalNum(v.expr));
    case "poly":
      return samePoly(optionText, v.expr);
    case "roots":
      return sameSet(parseRoots(optionText), trueRoots(v.expr));
    case "predicate":
      return (new Function(`return (${v.fn});`)() as (n: number) => boolean)(Number(optionText));
    case "pair": {
      const [a, b] = optionText.split(" and ").map(Number);
      return a * b === v.product && a + b === v.sum;
    }
  }
}

describe("content", () => {
  it("passes structural validation (graph, coverage, misconception tags)", () => {
    expect(validateContent()).toEqual([]);
  });

  it("has the 19-skill demo graph", () => {
    expect(skills).toHaveLength(19);
  });

  it.each(questions.map((q) => [q.id, q] as const))("%s: correct option verified in code, distractors are wrong", (_id, q) => {
    for (const o of q.options) {
      expect(isCorrect(q, o.text), `${q.id} option "${o.text}"`).toBe(o.correct);
    }
    const values = q.options.map((o) => o.text);
    expect(new Set(values).size).toBe(4);
  });
});
