import { expect, it } from "vitest";
import { CLASSMATES } from "./classroom";
import { CLASSMATE_COUNT, QUIZ_LENGTH } from "./constants";
import { QUIZ } from "./script";

it("intro constants match the demo runtime", () => {
  expect(QUIZ_LENGTH).toBe(QUIZ.length);
  expect(CLASSMATE_COUNT).toBe(CLASSMATES.length);
});
