import type { Question, SkillId } from "../content/types";
import type { CourseDef } from "../course";
import type { DemoState } from "../demo/flow";
import { displayStatus, estimateRemaining, evidenceFor, failedChain } from "../demo/view";
import { derive } from "../engine/evidence";
import { byId } from "../engine/graph";
import { scoreQuiz } from "../engine/scoring";
import type { LiveView, PublicQuestion } from "./types";

/** A question as the browser may see it: answer flags only once answered. */
export function publicQuestion(q: Question, answered: boolean): PublicQuestion {
  return {
    id: q.id,
    skillId: q.skillId,
    text: q.text,
    options: q.options.map((o) => (answered ? { text: o.text, correct: o.correct } : { text: o.text })),
  };
}

const index = new WeakMap<CourseDef, Map<string, Question>>();
function questionsOf(course: CourseDef) {
  let m = index.get(course);
  if (!m) index.set(course, (m = new Map(course.bank.questions.map((q) => [q.id, q]))));
  return m;
}

/** Project the flow state to what one student's browser may see. */
export function toLiveView(state: DemoState, course: CourseDef): LiveView {
  const { graph } = course;
  const questionById = { get: (id: string) => questionsOf(course).get(id)! };
  const misconceptions = course.bank.misconceptions;
  const QUIZ = course.quiz;
  const TARGET_SKILL = course.target;
  const derived = derive(graph, state.learner);
  const fb = state.feedback;
  const answered = !!fb;

  const quiz = state.learner.attempts.filter((a) => a.phase === "quiz");
  let report: LiveView["report"] = null;
  if (quiz.length === QUIZ.length) {
    const s = scoreQuiz(quiz);
    const counts = new Map<string, number>();
    for (const a of quiz) if (!a.correct && a.misconceptionId) counts.set(a.misconceptionId, (counts.get(a.misconceptionId) ?? 0) + 1);
    report = {
      percent: s.percent,
      correct: s.correct,
      total: s.total,
      improvement: s.improvement,
      mistakes: quiz.filter((a) => !a.correct).length,
      guesses: quiz.filter((a) => a.confidence === "guess").length,
      confidentlyWrong: quiz.filter((a) => !a.correct && a.confidence === "sure").length,
      recurring: [...counts.entries()].filter(([, n]) => n >= 2).map(([id]) => misconceptions[id]?.label ?? id),
      targetFailed: quiz.some((a) => a.skillId === TARGET_SKILL && !a.correct),
      rows: s.scored.map(({ attempt, expected, points }) => ({
        text: questionById.get(attempt.questionId).text,
        expected,
        correct: attempt.correct,
        confidence: attempt.confidence,
        points,
      })),
    };
  }

  let reveal: LiveView["reveal"] = null;
  const root = state.diagnosis?.rootGaps[0];
  if (root && state.diagnosed) {
    const d = derive(graph, state.diagnosed);
    const chain = failedChain(course, d, root);
    const foundation = graph.prereqs[root];
    const deeper = [...new Set(foundation.flatMap((f) => graph.prereqs[f]))].filter((id) => d.status[id] !== "unknown");
    const shown = new Set<SkillId>([...chain, ...foundation, ...deeper]);
    const row = (id: SkillId) => {
      const r = evidenceFor(course, state.diagnosed!, id, d);
      return { skill: r.skill, name: r.name, status: r.status, detail: r.detail };
    };
    reveal = {
      chain,
      rows: [...chain, ...foundation, ...deeper].map(row),
      others: [...course.scope].filter((id) => !shown.has(id) && d.status[id] !== "unknown").sort(byId).map(row),
    };
  }

  const m = state.mission;
  const evidence: LiveView["evidence"] = {};
  for (const id of graph.ids) {
    const answers = state.learner.attempts
      .filter((a) => a.skillId === id)
      .map((a) => ({ text: questionById.get(a.questionId).text, correct: a.correct, confidence: a.confidence, ...(a.disputed ? { disputed: true } : {}) }));
    evidence[id] = { detail: evidenceFor(course, state.learner, id, derived).detail, answers };
  }

  return {
    stage: state.stage,
    fast: state.fast,
    quizIndex: state.quizIndex,
    quizTotal: QUIZ.length,
    current: state.current
      ? { question: publicQuestion(state.current.question, answered), role: state.current.role, phase: state.current.phase }
      : null,
    feedback: fb
      ? {
          correct: fb.correct,
          optionIndex: fb.attempt.optionIndex,
          confidence: fb.attempt.confidence,
          message: fb.message,
          misconception: fb.misconception ? { label: fb.misconception.label, explain: fb.misconception.explain } : undefined,
          confidentlyWrong: fb.confidentlyWrong,
          recurring: fb.recurring,
        }
      : null,
    status: displayStatus(state, derived),
    probes: state.probes,
    pendingReason: state.pendingReason,
    pendingFrom: state.pendingFrom,
    remaining: estimateRemaining(course, derived),
    diagnosis: state.diagnosis,
    disputes: state.disputes,
    report,
    reveal,
    mission: m
      ? {
          root: m.plan.root,
          target: m.plan.target,
          path: m.plan.path,
          step: m.step,
          index: m.index,
          practiceCount: m.plan.practice.length,
          bridgeCount: m.plan.bridges.length,
          recap: state.probes
            .filter((p) => p.skill === m.plan.root)
            .slice(0, 3)
            .map((p) => {
              const q = questionById.get(p.questionId);
              const a = state.learner.attempts.find((x) => x.questionId === p.questionId)!;
              return { text: q.text, chosen: q.options[a.optionIndex].text };
            }),
        }
      : null,
    result: state.result,
    rising: graph.ids.filter((id) => derived.direct[id].status === "suspect" && derived.direct[id].passQs.length > 0),
    evidence,
  };
}
