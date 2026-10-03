/** Display formatting for authored maths text: x^2 → x², - → − (true minus). */
export function formatMath(text: string): string {
  return text.replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/-/g, "−");
}

/** Convert authored algebra text (2x, (x+1)(x-2), x^2, ×, ÷, √) into a JS expression in x. */
export function algebraToJs(text: string): string {
  return text
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/\^/g, "**")
    .replace(/√\(/g, "Math.sqrt(")
    .replace(/√(\d+)/g, "Math.sqrt($1)")
    .replace(/([0-9x)])\s*(?=[x(])/g, "$1*");
}
