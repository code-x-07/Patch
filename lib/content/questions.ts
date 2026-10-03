import type { Option, Question, QuestionKind, SkillId, Verify } from "./types";

const c = (text: string): Option => ({ text, correct: true });
const w = (text: string, misconceptionId: string, message?: string): Option => ({
  text,
  correct: false,
  misconceptionId,
  ...(message ? { message } : {}),
});

/** Deterministic option order so the correct answer isn't always first. */
function arrange(id: string, options: Option[]): Option[] {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function q(
  id: string,
  skillId: SkillId,
  kind: QuestionKind,
  text: string,
  verify: Verify,
  options: Option[],
  tier: 1 | 2 | 3 = 1,
): Question {
  return { id, skillId, kind, tier, text, verify, options: arrange(id, options) };
}

const num = (expr: string): Verify => ({ type: "num", expr });
const poly = (expr: string): Verify => ({ type: "poly", expr });
const roots = (expr: string): Verify => ({ type: "roots", expr });

export const questions: Question[] = [
  // S1 Fractions basics
  q("S1-d", "S1", "diagnostic", "What is 1/2 + 1/3?", num("1/2 + 1/3"), [c("5/6"), w("2/5", "added_tops_and_bottoms"), w("2/6", "no_common_denominator"), w("1/5", "added_denominators_only")]),
  q("S1-c1", "S1", "check", "What is 3/4 - 1/2?", num("3/4 - 1/2"), [c("1/4"), w("1", "subtracted_tops_and_bottoms"), w("2/4", "no_common_denominator"), w("5/4", "added_instead_of_subtracted")]),
  q("S1-c2", "S1", "check", "What is 2/3 × 3/4?", num("2/3 * 3/4"), [c("1/2"), w("5/7", "added_tops_and_bottoms"), w("8/9", "cross_multiplied"), w("17/12", "added_instead_of_multiplied_fractions")]),
  q("S1-c3", "S1", "check", "What is 5/6 - 1/3?", num("5/6 - 1/3"), [c("1/2"), w("4/3", "subtracted_tops_and_bottoms"), w("4/6", "no_common_denominator"), w("7/6", "added_instead_of_subtracted")]),
  q("S1-b", "S1", "bridge", "What is 3/5 + 1/10?", num("3/5 + 1/10"), [c("7/10"), w("4/15", "added_tops_and_bottoms"), w("4/10", "no_common_denominator"), w("3/50", "multiplied_instead_of_added")]),

  // S4 Negative numbers on the number line
  q("S4-d", "S4", "diagnostic", "On a number line, what number is 5 to the left of 2?", num("2 - 5"), [c("-3"), w("3", "lost_negative_sign"), w("7", "moved_wrong_direction"), w("-7", "added_sizes_then_negated")]),
  q("S4-c1", "S4", "check", "Which of these is the smallest number?", num("Math.min(-8, -2, 0, 1)"), [c("-8"), w("-2", "smaller_digit_means_smaller"), w("0", "zero_is_smallest"), w("1", "ignored_negative_signs")]),
  q("S4-c2", "S4", "check", "What number is 4 to the right of -6?", num("-6 + 4"), [c("-2"), w("-10", "moved_wrong_direction"), w("2", "lost_negative_sign"), w("10", "ignored_negative_signs")]),
  q("S4-c3", "S4", "check", "Which of these is the largest number?", num("Math.max(-1, -9, -4, -12)"), [c("-1"), w("-9", "bigger_digit_means_bigger"), w("-4", "bigger_digit_means_bigger", "−4 is further below zero than −1."), w("-12", "bigger_digit_means_bigger", "−12 is the furthest below zero, so it is the smallest.")]),
  q("S4-b", "S4", "bridge", "The temperature is -3 degrees and rises by 7 degrees. What is the new temperature?", num("-3 + 7"), [c("4"), w("-10", "moved_wrong_direction"), w("-4", "sign_of_larger_misapplied"), w("10", "ignored_negative_signs")]),

  // S11 Factors and multiples
  q("S11-d", "S11", "diagnostic", "What is the highest common factor of 12 and 18?", num("gcd(12, 18)"), [c("6"), w("3", "common_factor_not_highest"), w("36", "confused_hcf_lcm"), w("2", "common_factor_not_highest")]),
  q("S11-c1", "S11", "check", "What is the lowest common multiple of 4 and 6?", num("lcm(4, 6)"), [c("12"), w("24", "multiplied_numbers_for_lcm"), w("2", "confused_hcf_lcm"), w("10", "added_instead_of_multiplied")]),
  q("S11-c2", "S11", "check", "Which of these is a factor of 28?", { type: "predicate", fn: "v => 28 % v === 0" }, [c("7"), w("3", "factor_guess"), w("56", "confused_factor_multiple"), w("5", "factor_guess")]),
  q("S11-c3", "S11", "check", "What is the highest common factor of 20 and 30?", num("gcd(20, 30)"), [c("10"), w("5", "common_factor_not_highest"), w("60", "confused_hcf_lcm"), w("2", "common_factor_not_highest")]),
  q("S11-b", "S11", "bridge", "Which two numbers multiply to 12 and add to 7?", { type: "pair", product: 12, sum: 7 }, [c("3 and 4"), w("2 and 6", "product_only_ignored_sum", "2 × 6 = 12, but 2 + 6 = 8."), w("1 and 12", "product_only_ignored_sum", "1 × 12 = 12, but 1 + 12 = 13."), w("5 and 2", "sum_only_ignored_product", "5 + 2 = 7, but 5 × 2 = 10.")]),

  // S2 Adding and subtracting integers
  q("S2-d", "S2", "diagnostic", "What is -7 + 3?", num("-7 + 3"), [c("-4"), w("-10", "added_sizes_kept_sign"), w("4", "dropped_sign_of_larger"), w("10", "added_and_dropped_sign")]),
  q("S2-c1", "S2", "check", "What is 5 - (-4)?", num("5 - (-4)"), [c("9"), w("1", "minus_negative_stays_minus"), w("-9", "dropped_negative"), w("-1", "minus_negative_stays_minus")]),
  q("S2-c2", "S2", "check", "What is -6 - 5?", num("-6 - 5"), [c("-11"), w("-1", "subtracted_sizes"), w("11", "dropped_negative"), w("1", "subtracted_sizes")]),
  q("S2-c3", "S2", "check", "What is -2 + (-8)?", num("-2 + (-8)"), [c("-10"), w("6", "treated_as_minus_negative"), w("-6", "subtracted_sizes"), w("10", "dropped_negative")]),
  q("S2-b", "S2", "bridge", "What is -4 - (-9)?", num("-4 - (-9)"), [c("5"), w("-13", "minus_negative_stays_minus"), w("-5", "dropped_sign_of_larger"), w("13", "added_and_dropped_sign")]),

  // S3 Multiplying and dividing integers (seed questions written exactly)
  q("S3-d", "S3", "diagnostic", "What is (-3) × (-4)?", num("(-3) * (-4)"), [c("12"), w("-12", "neg_times_neg_negative", "You kept the negative sign. Two negatives multiplied make a positive."), w("-7", "added_instead_of_multiplied", "You added the numbers. Here you multiply."), w("7", "added_and_dropped_sign", "You added the sizes and ignored the multiplication.")]),
  q("S3-c1", "S3", "check", "What is -5 × 6?", num("-5 * 6"), [c("-30"), w("30", "ignored_sign", "A negative times a positive stays negative."), w("-11", "subtracted_instead_of_multiplied", "You calculated −5 − 6. This question asks you to multiply −5 by 6."), w("1", "added_instead_of_multiplied", "You calculated −5 + 6. This question asks you to multiply −5 by 6.")]),
  q("S3-c2", "S3", "check", "What is (-2) × (-2) × (-2)?", num("(-2) * (-2) * (-2)"), [c("-8"), w("8", "all_products_positive", "Pairs of negatives cancel, but with three negatives one is left over."), w("-6", "added_instead_of_multiplied"), w("6", "added_and_dropped_sign")]),
  q("S3-c3", "S3", "check", "What is 24 ÷ (-6)?", num("24 / (-6)"), [c("-4"), w("4", "ignored_sign", "A positive divided by a negative is negative."), w("18", "added_instead_of_multiplied", "You calculated 24 + (−6). This question asks you to divide."), w("-144", "multiplied_instead_of_divided")]),
  q("S3-c4", "S3", "check", "What is (-36) ÷ (-9)?", num("(-36) / (-9)"), [c("4"), w("-4", "neg_times_neg_negative", "Two negatives divided give a positive."), w("-27", "subtracted_instead_of_divided"), w("-45", "added_instead_of_multiplied", "You added the numbers. Here you divide.")]),
  q("S3-c5", "S3", "check", "What is (-7) × 3?", num("(-7) * 3"), [c("-21"), w("21", "ignored_sign"), w("-4", "added_instead_of_multiplied"), w("-10", "subtracted_instead_of_multiplied")]),
  q("S3-c6", "S3", "check", "What is (-8) × (-2) × 3?", num("(-8) * (-2) * 3"), [c("48"), w("-48", "neg_times_neg_negative"), w("-7", "added_instead_of_multiplied"), w("13", "added_and_dropped_sign")]),
  q("S3-b", "S3", "bridge", "What is (-6) × (-5)?", num("(-6) * (-5)"), [c("30"), w("-30", "neg_times_neg_negative"), w("-11", "added_instead_of_multiplied"), w("11", "added_and_dropped_sign")]),

  // S5 Order of operations
  q("S5-d", "S5", "diagnostic", "What is 3 + 4 × 2?", num("3 + 4 * 2"), [c("11"), w("14", "left_to_right_ignoring_precedence"), w("9", "added_all"), w("24", "added_all", "Check each symbol: one is +, one is ×.")]),
  q("S5-c1", "S5", "check", "What is 20 - 6 ÷ 2?", num("20 - 6 / 2"), [c("17"), w("7", "left_to_right_ignoring_precedence"), w("23", "sign_error_after_division"), w("14", "ignored_division")]),
  q("S5-c2", "S5", "check", "What is (2 + 3)^2?", num("(2 + 3) ** 2"), [c("25"), w("13", "squared_terms_separately"), w("10", "doubled_instead_of_squared"), w("11", "bracket_ignored")]),
  q("S5-c3", "S5", "check", "What is 2 × (5 - 1) + 3?", num("2 * (5 - 1) + 3"), [c("11"), w("12", "ignored_brackets"), w("14", "added_before_multiplying"), w("8", "dropped_addition")]),
  q("S5-b", "S5", "bridge", "What is 10 - 2 × 3?", num("10 - 2 * 3"), [c("4"), w("24", "left_to_right_ignoring_precedence"), w("16", "sign_error_after_multiplication"), w("7", "ignored_multiplication")]),

  // S7 Collecting like terms
  q("S7-d", "S7", "diagnostic", "Simplify 3x + 5 - x + 2", poly("3x + 5 - x + 2"), [c("2x + 7"), w("3x + 7", "ignored_minus_x"), w("4x + 7", "sign_ignored_on_term", "The x is subtracted, not added."), w("9x", "combined_unlike_terms")]),
  q("S7-c1", "S7", "check", "Simplify 5x - 2 - 3x - 4", poly("5x - 2 - 3x - 4"), [c("2x - 6"), w("2x - 2", "sign_ignored_on_term", "−2 − 4 is −6."), w("8x - 6", "sign_ignored_on_term", "The 3x is subtracted, not added."), w("-4x", "combined_unlike_terms")]),
  q("S7-c2", "S7", "check", "Simplify 2x + 3 + 4x - 7", poly("2x + 3 + 4x - 7"), [c("6x - 4"), w("6x + 4", "sign_ignored_on_term", "+3 − 7 is −4."), w("2x", "combined_unlike_terms"), w("6x + 10", "added_magnitudes")]),
  q("S7-c3", "S7", "check", "Simplify x + x + x - 2", poly("x + x + x - 2"), [c("3x - 2"), w("x^3 - 2", "multiplied_repeated_term"), w("3x + 2", "sign_ignored_on_term"), w("x", "combined_unlike_terms")]),
  q("S7-b", "S7", "bridge", "Simplify 7x - 2x + 3 - 5", poly("7x - 2x + 3 - 5"), [c("5x - 2"), w("9x - 2", "sign_ignored_on_term", "The 2x is subtracted, not added."), w("5x + 8", "added_magnitudes"), w("3x", "combined_unlike_terms")]),

  // S15 Inverse operations and moving terms
  q("S15-d", "S15", "diagnostic", "Solve x + 7 = 3", roots("x + 7 - 3"), [c("x = -4"), w("x = 10", "did_same_operation", "To undo + 7, subtract 7 from both sides."), w("x = 4", "lost_negative_sign", "3 − 7 is below zero."), w("x = -10", "did_same_operation")]),
  q("S15-c1", "S15", "check", "Solve x - 5 = -2", roots("x - 5 + 2"), [c("x = 3"), w("x = -7", "did_same_operation"), w("x = -3", "dropped_sign_of_larger"), w("x = 7", "did_same_operation")]),
  q("S15-c2", "S15", "check", "Solve 3x = -12", roots("3x + 12"), [c("x = -4"), w("x = -36", "did_same_operation", "To undo × 3, divide by 3."), w("x = 4", "ignored_sign"), w("x = -15", "subtracted_instead_of_divided")]),
  q("S15-c3", "S15", "check", "Solve x ÷ 4 = 5", roots("x / 4 - 5"), [c("x = 20"), w("x = 5/4", "did_same_operation", "To undo ÷ 4, multiply by 4."), w("x = 9", "added_instead_of_multiplied"), w("x = 1", "subtracted_instead_of_multiplied")]),
  q("S15-b", "S15", "bridge", "Solve x + 9 = 4", roots("x + 9 - 4"), [c("x = -5"), w("x = 13", "did_same_operation"), w("x = 5", "lost_negative_sign"), w("x = -13", "did_same_operation")]),

  // S14 Solving linear equations
  q("S14-d", "S14", "diagnostic", "Solve 2x + 3 = 11", roots("2x + 3 - 11"), [c("x = 4"), w("x = 7", "wrong_inverse_sign"), w("x = 8", "forgot_to_divide"), w("x = 11/2", "ignored_constant")]),
  q("S14-c1", "S14", "check", "Solve 5x - 4 = 3x + 6", roots("5x - 4 - 3x - 6"), [c("x = 5"), w("x = 5/4", "moved_term_without_changing_sign"), w("x = 1", "moved_constant_without_changing_sign"), w("x = 10", "forgot_to_divide")]),
  q("S14-c2", "S14", "check", "Solve 4(x - 1) = 12", roots("4(x - 1) - 12"), [c("x = 4"), w("x = 13/4", "distribute_first_term_only"), w("x = 2", "moved_constant_without_changing_sign"), w("x = 3", "ignored_bracket_subtraction")]),
  q("S14-c3", "S14", "check", "Solve 7 - 2x = 1", roots("7 - 2x - 1"), [c("x = 3"), w("x = -3", "ignored_sign", "Dividing −6 by −2 gives +3."), w("x = 4", "moved_constant_without_changing_sign"), w("x = 6", "forgot_to_divide")]),
  q("S14-b", "S14", "bridge", "Solve 3x + 5 = x - 7", roots("3x + 5 - x + 7"), [c("x = -6"), w("x = -3", "moved_term_without_changing_sign"), w("x = -1", "moved_constant_without_changing_sign"), w("x = -12", "forgot_to_divide")]),

  // S16 Zero product property
  q("S16-d", "S16", "diagnostic", "Solve (x - 4)(x + 1) = 0", roots("(x - 4)(x + 1)"), [c("x = 4 or x = -1"), w("x = -4 or x = 1", "roots_equal_factor_constants"), w("x = 4 or x = 1", "dropped_negative_root"), w("x = 0", "thought_answer_is_zero")]),
  q("S16-c1", "S16", "check", "Solve x(x - 6) = 0", roots("x(x - 6)"), [c("x = 0 or x = 6"), w("x = 6", "dropped_x_factor"), w("x = 0 or x = -6", "roots_equal_factor_constants"), w("x = -6", "roots_equal_factor_constants")]),
  q("S16-c2", "S16", "check", "Solve (x + 3)(x - 2) = 0", roots("(x + 3)(x - 2)"), [c("x = -3 or x = 2"), w("x = 3 or x = -2", "roots_equal_factor_constants"), w("x = 3 or x = 2", "dropped_negative_root"), w("x = -6", "multiplied_constants")]),
  q("S16-c3", "S16", "check", "Solve (2x - 1)(x + 5) = 0", roots("(2x - 1)(x + 5)"), [c("x = 1/2 or x = -5"), w("x = 1 or x = -5", "forgot_coefficient"), w("x = -1/2 or x = 5", "roots_equal_factor_constants"), w("x = 2 or x = -5", "divided_wrong_way")]),
  q("S16-b", "S16", "bridge", "Solve (x - 7)(x - 3) = 0", roots("(x - 7)(x - 3)"), [c("x = 7 or x = 3"), w("x = -7 or x = -3", "roots_equal_factor_constants"), w("x = 21", "multiplied_constants"), w("x = 10", "added_constants")]),

  // S6 Substituting values into expressions
  q("S6-d", "S6", "diagnostic", "If x = -2, what is 3x + 5?", num("3 * (-2) + 5"), [c("-1"), w("11", "lost_sign_on_substitution"), w("-11", "sign_error_on_constant"), w("1", "dropped_final_sign")]),
  q("S6-c1", "S6", "check", "If x = -3, what is x^2?", num("(-3) ** 2"), [c("9"), w("-9", "squared_without_brackets"), w("-6", "doubled_instead_of_squared"), w("6", "doubled_instead_of_squared")]),
  q("S6-c2", "S6", "check", "If a = 4 and b = -1, what is 2a - 3b?", num("2 * 4 - 3 * (-1)"), [c("11"), w("5", "lost_sign_on_substitution"), w("8", "dropped_second_term"), w("-5", "sign_errors_both")]),
  q("S6-c3", "S6", "check", "If x = -1, what is x^2 - 4x?", num("(-1) ** 2 - 4 * (-1)"), [c("5"), w("3", "squared_without_brackets"), w("-3", "lost_sign_on_substitution"), w("-5", "sign_errors_both")]),
  q("S6-b", "S6", "bridge", "If x = 5, what is 2x^2?", num("2 * 5 ** 2"), [c("50"), w("100", "squared_coefficient_too"), w("20", "doubled_instead_of_squared"), w("25", "ignored_coefficient")]),

  // S8 The distributive law
  q("S8-d", "S8", "diagnostic", "Expand 3(x - 4).", poly("3(x - 4)"), [c("3x - 12"), w("3x - 4", "distribute_first_term_only", "You multiplied only the first term. The 3 multiplies everything inside."), w("3x + 12", "sign_flip_on_second_term", "Check the sign. 3 times −4 is −12."), w("3x - 1", "added_instead_of_multiplied", "You added 3 to −4 instead of multiplying them. Distributing gives 3x + 3 times −4, so the constant is −12.")]),
  q("S8-c1", "S8", "check", "Expand 5(2x + 3).", poly("5(2x + 3)"), [c("10x + 15"), w("10x + 3", "distribute_first_term_only"), w("7x + 8", "added_instead_of_multiplied"), w("2x + 15", "distribute_first_term_only", "The 5 multiplies the 2x too.")]),
  q("S8-c2", "S8", "check", "Expand -4(x + 2).", poly("-4(x + 2)"), [c("-4x - 8"), w("-4x + 8", "sign_flip_on_second_term", "−4 × 2 is −8."), w("-4x + 2", "distribute_first_term_only"), w("4x - 8", "sign_flip_on_first_term")]),
  q("S8-c3", "S8", "check", "Expand 2(3 - x).", poly("2(3 - x)"), [c("6 - 2x"), w("6 - x", "distribute_first_term_only"), w("6 + 2x", "sign_flip_on_second_term"), w("5 - 2x", "added_instead_of_multiplied")]),
  q("S8-b", "S8", "bridge", "Expand 6(x - 2).", poly("6(x - 2)"), [c("6x - 12"), w("6x - 2", "distribute_first_term_only"), w("6x + 12", "sign_flip_on_second_term"), w("6x - 8", "added_instead_of_multiplied", "You added 6 and 2 instead of multiplying them.")]),

  // S9 Expanding single brackets
  q("S9-d", "S9", "diagnostic", "Expand -2(x - 3).", poly("-2(x - 3)"), [c("-2x + 6"), w("-2x - 6", "neg_times_neg_negative", "−2 times −3 is positive 6."), w("-2x + 3", "distribute_first_term_only"), w("2x + 6", "sign_flip_on_first_term")]),
  q("S9-c1", "S9", "check", "Expand and simplify 3(x + 2) + x.", poly("3(x + 2) + x"), [c("4x + 6"), w("4x + 2", "distribute_first_term_only"), w("3x + 6", "forgot_extra_term"), w("4x + 5", "added_instead_of_multiplied")]),
  q("S9-c2", "S9", "check", "Expand -3(2x - 5).", poly("-3(2x - 5)"), [c("-6x + 15"), w("-6x - 15", "neg_times_neg_negative", "−3 times −5 is positive 15."), w("-6x - 5", "distribute_first_term_only"), w("6x + 15", "sign_flip_on_first_term")]),
  q("S9-c3", "S9", "check", "Expand and simplify 2(x - 4) - 3x.", poly("2(x - 4) - 3x"), [c("-x - 8"), w("-x - 4", "distribute_first_term_only"), w("5x - 8", "sign_ignored_on_term"), w("-x + 8", "sign_flip_on_second_term")]),
  q("S9-b", "S9", "bridge", "Expand -(x - 7).", poly("-(x - 7)"), [c("-x + 7"), w("-x - 7", "neg_times_neg_negative", "−1 times −7 is positive 7."), w("x - 7", "ignored_leading_minus"), w("x + 7", "sign_flip_on_first_term")]),

  // S10 Expanding double brackets
  q("S10-d", "S10", "diagnostic", "Expand (x + 2)(x - 5).", poly("(x + 2)(x - 5)"), [c("x^2 - 3x - 10"), w("x^2 - 3x + 10", "neg_times_pos_positive", "+2 times −5 is −10."), w("x^2 - 10", "dropped_middle_term", "Expanding gives four terms, and the two middle ones combine."), w("x^2 + 3x - 10", "sign_error_in_middle")]),
  q("S10-c1", "S10", "check", "Expand (x - 3)(x - 4).", poly("(x - 3)(x - 4)"), [c("x^2 - 7x + 12"), w("x^2 - 7x - 12", "neg_times_neg_negative", "−3 times −4 is +12."), w("x^2 + 12", "dropped_middle_term"), w("x^2 - x + 12", "subtracted_middle_terms")]),
  q("S10-c2", "S10", "check", "Expand (x + 6)(x - 1).", poly("(x + 6)(x - 1)"), [c("x^2 + 5x - 6"), w("x^2 + 5x + 6", "neg_times_pos_positive", "+6 times −1 is −6."), w("x^2 - 6", "dropped_middle_term"), w("x^2 - 5x - 6", "sign_error_in_middle")]),
  q("S10-c3", "S10", "check", "Expand (x - 2)^2.", poly("(x - 2) ** 2"), [c("x^2 - 4x + 4"), w("x^2 + 4", "squared_terms_separately"), w("x^2 - 4", "squared_terms_separately"), w("x^2 - 4x - 4", "neg_times_neg_negative", "−2 times −2 is +4.")]),
  q("S10-b", "S10", "bridge", "Expand (x - 5)(x + 3).", poly("(x - 5)(x + 3)"), [c("x^2 - 2x - 15"), w("x^2 - 2x + 15", "neg_times_pos_positive", "−5 times +3 is −15."), w("x^2 - 15", "dropped_middle_term"), w("x^2 + 2x - 15", "sign_error_in_middle")]),

  // S12 Factorising by common factor
  q("S12-d", "S12", "diagnostic", "Factorise 6x + 9.", poly("6x + 9"), [c("3(2x + 3)"), w("3(2x + 9)", "divided_first_term_only"), w("6(x + 9)", "common_factor_not_dividing_all"), w("2(3x + 9)", "wrong_common_factor", "2 does not divide 9.")]),
  q("S12-c1", "S12", "check", "Factorise x^2 + 5x.", poly("x ** 2 + 5x"), [c("x(x + 5)"), w("x(x + 5x)", "divided_first_term_only"), w("5x(x + 1)", "wrong_common_factor"), w("x^2(1 + 5)", "wrong_common_factor")]),
  q("S12-c2", "S12", "check", "Factorise 4x - 12.", poly("4x - 12"), [c("4(x - 3)"), w("4(x - 12)", "divided_first_term_only"), w("4(x + 3)", "sign_flip_on_second_term"), w("2(2x - 12)", "divided_first_term_only")]),
  q("S12-c3", "S12", "check", "Factorise 10x^2 - 15x.", poly("10 * x ** 2 - 15x"), [c("5x(2x - 3)"), w("5(2x^2 - 15x)", "divided_first_term_only"), w("5x(2x + 3)", "sign_flip_on_second_term"), w("x(10x - 3)", "common_factor_not_dividing_all")]),
  q("S12-b", "S12", "bridge", "Factorise 8x + 20.", poly("8x + 20"), [c("4(2x + 5)"), w("4(2x + 20)", "divided_first_term_only"), w("8(x + 20)", "common_factor_not_dividing_all"), w("4(4x + 5)", "wrong_common_factor")]),

  // S13 Factorising quadratics
  q("S13-d", "S13", "diagnostic", "Factorise x^2 + 2x - 15.", poly("x ** 2 + 2x - 15"), [c("(x + 5)(x - 3)"), w("(x - 5)(x + 3)", "swapped_signs", "Check by expanding: this gives −2x, not +2x."), w("(x + 15)(x - 1)", "product_only_ignored_sum", "The numbers must multiply to −15 and also add to +2."), w("(x + 5)(x + 3)", "dropped_negative_constant")]),
  q("S13-c1", "S13", "check", "Factorise x^2 - 5x + 6.", poly("x ** 2 - 5x + 6"), [c("(x - 2)(x - 3)"), w("(x + 2)(x + 3)", "swapped_signs", "Check by expanding: this gives +5x, not −5x."), w("(x - 6)(x + 1)", "sign_error_in_pair"), w("(x - 1)(x - 6)", "product_only_ignored_sum")]),
  q("S13-c2", "S13", "check", "Factorise x^2 + x - 12.", poly("x ** 2 + x - 12"), [c("(x + 4)(x - 3)"), w("(x - 4)(x + 3)", "swapped_signs", "Check by expanding: this gives −x, not +x."), w("(x + 6)(x - 2)", "product_only_ignored_sum"), w("(x + 4)(x + 3)", "dropped_negative_constant")]),
  q("S13-c3", "S13", "check", "Factorise x^2 - 2x - 8.", poly("x ** 2 - 2x - 8"), [c("(x - 4)(x + 2)"), w("(x + 4)(x - 2)", "swapped_signs", "Check by expanding: this gives +2x, not −2x."), w("(x - 8)(x + 1)", "product_only_ignored_sum"), w("(x - 4)(x - 2)", "dropped_negative_constant")]),
  q("S13-b", "S13", "bridge", "Factorise x^2 - 9x + 20.", poly("x ** 2 - 9x + 20"), [c("(x - 4)(x - 5)"), w("(x + 4)(x + 5)", "swapped_signs", "Check by expanding: this gives +9x, not −9x."), w("(x - 10)(x - 2)", "product_only_ignored_sum"), w("(x - 4)(x + 5)", "sign_error_in_pair")]),

  // S17 Solving quadratics by factorisation (target)
  q("S17-d", "S17", "diagnostic", "Solve x^2 + x - 6 = 0.", roots("x ** 2 + x - 6"), [c("x = -3 or x = 2"), w("x = 3 or x = -2", "roots_equal_factor_constants", "The roots have the opposite sign to the numbers in the brackets."), w("x = 6 or x = -1", "product_only_ignored_sum"), w("x = -3 or x = -2", "wrong_factor_pair")], 2),
  q("S17-c1", "S17", "check", "Solve x^2 - 3x - 10 = 0.", roots("x ** 2 - 3x - 10"), [c("x = 5 or x = -2"), w("x = -5 or x = 2", "roots_equal_factor_constants"), w("x = 10 or x = -1", "product_only_ignored_sum"), w("x = 5 or x = 2", "dropped_negative_constant")], 2),
  q("S17-c2", "S17", "check", "Solve x^2 + 5x + 6 = 0.", roots("x ** 2 + 5x + 6"), [c("x = -2 or x = -3"), w("x = 2 or x = 3", "roots_equal_factor_constants"), w("x = -6 or x = -1", "product_only_ignored_sum"), w("x = -2 or x = 3", "wrong_factor_pair")], 2),
  q("S17-boss1", "S17", "boss", "Solve x^2 - x - 12 = 0.", roots("x ** 2 - x - 12"), [c("x = 4 or x = -3"), w("x = -4 or x = 3", "roots_equal_factor_constants"), w("x = 12 or x = -1", "product_only_ignored_sum"), w("x = 4 or x = 3", "dropped_negative_constant")], 2),
  q("S17-boss2", "S17", "boss", "Solve x^2 + 2x - 8 = 0.", roots("x ** 2 + 2x - 8"), [c("x = -4 or x = 2"), w("x = 4 or x = -2", "roots_equal_factor_constants"), w("x = -8 or x = 1", "product_only_ignored_sum"), w("x = 4 or x = 2", "dropped_negative_constant")], 2),
  q("S17-boss3", "S17", "boss", "Solve x^2 - 4x - 5 = 0.", roots("x ** 2 - 4x - 5"), [c("x = 5 or x = -1"), w("x = -5 or x = 1", "roots_equal_factor_constants"), w("x = 5 or x = 1", "dropped_negative_constant"), w("x = -5 or x = -1", "wrong_factor_pair")], 2),
  q("S17-boss4", "S17", "boss", "Solve x^2 + 3x - 18 = 0.", roots("x ** 2 + 3x - 18"), [c("x = -6 or x = 3"), w("x = 6 or x = -3", "roots_equal_factor_constants"), w("x = -9 or x = 2", "product_only_ignored_sum"), w("x = 6 or x = 3", "dropped_negative_constant")], 2),

  // S18 Squares and square roots
  q("S18-d", "S18", "diagnostic", "What is (-6)^2?", num("(-6) ** 2"), [c("36"), w("-36", "squared_without_brackets"), w("-12", "doubled_instead_of_squared"), w("12", "doubled_instead_of_squared")]),
  q("S18-c1", "S18", "check", "What is √81?", num("Math.sqrt(81)"), [c("9"), w("40.5", "halved_instead_of_root"), w("6561", "squared_instead_of_root"), w("8", "near_miss_root")]),
  q("S18-c2", "S18", "check", "What is 7^2 - 3^2?", num("7 ** 2 - 3 ** 2"), [c("40"), w("16", "subtracted_before_squaring"), w("8", "doubled_instead_of_squared"), w("4", "ignored_powers")]),
  q("S18-c3", "S18", "check", "What is (-3)^2 + 1?", num("(-3) ** 2 + 1"), [c("10"), w("-8", "squared_without_brackets"), w("-5", "doubled_instead_of_squared"), w("4", "added_before_squaring")]),
  q("S18-b", "S18", "bridge", "What is √(16 × 9)?", num("Math.sqrt(16 * 9)"), [c("12"), w("72", "halved_instead_of_root"), w("7", "added_roots"), w("144", "forgot_root")]),

  // S19 The quadratic formula
  q("S19-d", "S19", "diagnostic", "For x^2 + 3x - 4 = 0, what is b^2 - 4ac?", num("3 ** 2 - 4 * 1 * (-4)"), [c("25"), w("-7", "sign_error_in_discriminant"), w("13", "forgot_factor_4"), w("9", "ignored_4ac")], 2),
  q("S19-c1", "S19", "check", "Use the quadratic formula to solve x^2 - 2x - 3 = 0.", roots("x ** 2 - 2x - 3"), [c("x = 3 or x = -1"), w("x = -3 or x = 1", "sign_error_on_b"), w("x = 6 or x = -2", "forgot_to_divide_by_2a"), w("x = 4 or x = -2", "formula_arithmetic_slip")], 2),
  q("S19-c2", "S19", "check", "For 2x^2 - x - 3 = 0, what is b^2 - 4ac?", num("(-1) ** 2 - 4 * 2 * (-3)"), [c("25"), w("-23", "sign_error_in_discriminant"), w("1", "ignored_4ac"), w("13", "forgot_factor_4")], 2),
  q("S19-c3", "S19", "check", "Use the quadratic formula to solve 2x^2 - x - 3 = 0.", roots("2 * x ** 2 - x - 3"), [c("x = 3/2 or x = -1"), w("x = 3 or x = -2", "divided_by_2_not_2a"), w("x = -3/2 or x = 1", "sign_error_on_b"), w("x = 6 or x = -4", "forgot_to_divide_by_2a")], 2),
  q("S19-b", "S19", "bridge", "For x^2 + 4x + 4 = 0, what is b^2 - 4ac?", num("4 ** 2 - 4 * 1 * 4"), [c("0"), w("32", "sign_error_in_discriminant"), w("16", "ignored_4ac"), w("12", "forgot_factor_4")], 2),
];

export const questionById: Record<string, Question> = Object.fromEntries(
  questions.map((qn) => [qn.id, qn]),
);

export function questionsForSkill(skillId: SkillId): Question[] {
  return questions.filter((qn) => qn.skillId === skillId);
}
