/**
 * Scoring an assessment that contains manually-graded questions.
 *
 * Every other question type in this system is scored the instant the attempt is
 * submitted. A subjective question is not: a human awards its marks later. So an attempt
 * that contains one has a PROVISIONAL score, and that single fact is what this module
 * exists to make unmissable — because the alternative is a report that renders
 * "40% · Failed" to a student with 30 marks still unread, which is both wrong and the
 * kind of wrong that reaches a placement cell before it reaches us.
 *
 * Shared byte-identical across both repos (ADR-011): the backend persists these numbers
 * and the frontend renders the provisional state from the same definition.
 *
 * THE RULE: `awardedMarks === null` means NOT YET EVALUATED. It is never 0, because 0 is
 * a mark an evaluator can legitimately award. Everything here keys on that distinction.
 */

/** One manually-graded question on an attempt. */
export interface SubjectiveMark {
  /** The paper's marks for this question — the ceiling an evaluator may award. */
  marks: number;
  /** Marks awarded, or null when nobody has evaluated it yet. */
  awardedMarks: number | null;
}

export interface ProvisionalScore {
  /** Marks awarded so far: everything auto-graded, plus evaluated subjective answers. */
  score: number;
  /** The paper's full marks, including questions awaiting review. */
  total: number;
  /** Marks still locked behind a human review. */
  pendingMarks: number;
  /** How many questions are awaiting review. */
  pendingCount: number;
  /**
   * True while anything is pending. A caller MUST withhold pass/fail while this is true —
   * the score cannot go down from here, so a "fail" is not yet a fact.
   */
  provisional: boolean;
  /** The ceiling if every pending mark were awarded in full. */
  maxPossibleScore: number;
}

/** Marks awarded can never exceed the question's marks, nor go below zero. */
export function clampAwardedMarks(awarded: number, max: number): number {
  if (!Number.isFinite(awarded)) return 0;
  // Round to 2dp: awarded_marks is numeric(6,2) and half marks are normal in manual
  // evaluation, but a float artefact must not be persisted.
  const bounded = Math.min(Math.max(awarded, 0), Math.max(0, max));
  return Math.round(bounded * 100) / 100;
}

/**
 * Combine the auto-graded part of an attempt with its manually-graded questions.
 *
 * `autoScore` / `autoTotal` are what the existing grader already produces for MCQ,
 * MULTI_SELECT, NUMERIC and CODING. Subjective questions are added to `total` — the
 * paper's marks are the paper's marks — and contribute to `score` only once evaluated.
 */
export function provisionalScore(
  autoScore: number,
  autoTotal: number,
  subjective: readonly SubjectiveMark[],
): ProvisionalScore {
  let score = autoScore;
  let total = autoTotal;
  let pendingMarks = 0;
  let pendingCount = 0;

  for (const s of subjective) {
    const marks = Number.isFinite(s.marks) ? Math.max(0, s.marks) : 0;
    total += marks;
    if (s.awardedMarks === null || s.awardedMarks === undefined) {
      pendingMarks += marks;
      pendingCount += 1;
    } else {
      score += clampAwardedMarks(s.awardedMarks, marks);
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    score: round(score),
    total: round(total),
    pendingMarks: round(pendingMarks),
    pendingCount,
    provisional: pendingCount > 0,
    maxPossibleScore: round(score + pendingMarks),
  };
}

/**
 * Pass/fail, or `null` while the result is provisional.
 *
 * Returning null rather than false is the point: a student with marks awaiting review has
 * not failed, and a UI that reads a boolean here would render exactly that.
 *
 * One exception, and it is a real one: when the marks already awarded ALONE clear the
 * threshold, the pass is a fact no review can take away, so it is reported immediately.
 * The reverse is not symmetric — a fail can always be overturned by the pending marks.
 */
export function provisionalVerdict(
  s: ProvisionalScore,
  passingScorePct: number,
): boolean | null {
  if (s.total <= 0) return null;
  const needed = (passingScorePct / 100) * s.total;
  if (s.score >= needed) return true;
  if (s.provisional) return null;
  return false;
}

/** Words in a free-text answer. Collapses all whitespace; '' is 0, not 1. */
export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Is this answer over its word ceiling?
 *
 * The limit is advisory in the runner (the student sees a counter) and enforced on the
 * server, so a client that ignores it cannot submit a 5,000-word essay into a 200-word
 * box. A null limit means no limit.
 */
export function exceedsWordLimit(
  text: string | null | undefined,
  maxWords: number | null | undefined,
): boolean {
  if (!maxWords || maxWords <= 0) return false;
  return wordCount(text) > maxWords;
}

/** Hard ceiling on a stored answer, independent of any per-question word limit. */
export const SUBJECTIVE_ANSWER_MAX_CHARS = 20_000;
