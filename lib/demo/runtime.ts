// Everything in the demo that carries the answer key. DemoApp loads this module
// with a dynamic import *before* enabling Start demo, so it lands in its own
// chunk that only /demo requests, never in code shared with Live Mode (/play).
export { DEMO_COURSE, initialState, reducer } from "./course";
export { DEMO_STUDENT, QUIZ, scriptedAnswer } from "./script";
export { CLASSMATES, classReport, simulatedClassmates } from "./classroom";
export { toLiveView } from "../live/view";
