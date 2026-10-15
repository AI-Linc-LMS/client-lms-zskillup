/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * FLAGGING QUESTIONS FOR REVIEW (PRD §23.8).
 *
 * §23.8: "Validate that generated questions match the stated skills and round type; FLAG
 * DUPLICATE, AMBIGUOUS, INCOMPLETE OR POTENTIALLY UNSOLVABLE QUESTIONS FOR REVIEW."
 *
 * THE OPERATIVE WORD IS "FLAG". Nothing here rejects a question or deletes one. Every
 * check is a prompt to look, because every one of them has false positives: a deliberately
 * negated stem is sometimes exactly right, two similar questions are sometimes a
 * deliberate pair at different difficulties, and "none of the above" is occasionally the
 * honest answer. A checker that silently removed questions would quietly narrow a paper
 * and nobody would know which questions went.
 *
 * SO EVERY FLAG SAYS WHAT TO LOOK AT AND WHY, and severity separates "this paper is
 * unanswerable" from "somebody should read this again". The first blocks publishing on any
 * sensible workflow; the second is a to-do list.
 *
 * WHAT IS DELIBERATELY NOT CHECKED, and §23.8 does ask for some of it:
 *
 *   - whether the answer is factually CORRECT;
 *   - whether the question is at its stated DIFFICULTY;
 *   - whether it "matches the stated skills" — §23.8's words.
 *
 * None of the three can be decided from the text. A checker that guessed would hand
 * reviewers a list of confident wrong answers, and they would stop reading it — which
 * costs more than not offering it, because it also costs them the checks that do work.
 * There is no OFF_TOPIC flag for the same reason: a flag nothing can emit honestly is
 * worse than an absent one, since it reads on screen as a check that is passing.
 */

/** What is wrong, or might be. */
export enum QuestionFlag {
  /** Two questions are near-identical. */
  DUPLICATE = 'DUPLICATE',
  /** Missing something a question needs to be answerable at all. */
  INCOMPLETE = 'INCOMPLETE',
  /** Cannot be answered correctly as written. */
  UNSOLVABLE = 'UNSOLVABLE',
  /** Answerable, but a careful student could reasonably pick more than one. */
  AMBIGUOUS = 'AMBIGUOUS',
}

/**
 * How much it matters.
 *
 * BLOCKING means the question cannot be answered as written — a student meeting it loses
 * marks for the author's mistake. REVIEW means somebody should read it; it may well be
 * fine.
 */
export enum FlagSeverity {
  BLOCKING = 'BLOCKING',
  REVIEW = 'REVIEW',
}

export interface QuestionIssue {
  questionId: string;
  flag: QuestionFlag;
  severity: FlagSeverity;
  /** What to look at, in a sentence a reviewer can act on. */
  message: string;
  /** The other question, when the flag is about a pair. */
  relatedQuestionId?: string;
}

/** The minimum a question needs for any of this to be checkable. */
export interface CheckableQuestion {
  id: string;
  stem: string;
  /** Empty for a non-MCQ. */
  options: Array<{ text: string; isCorrect: boolean }>;
  /** Topic or skill it was authored against, when known. */
  topic?: string | null;
  /** True when the question is meant to accept several answers. */
  multiSelect?: boolean;
}

/** Normalised for comparison: case, punctuation and spacing are not meaning. */
function normalise(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word-overlap similarity, 0–1.
 *
 * Deliberately crude. A proper embedding comparison would catch more, and would also need
 * a model call per question pair on every check — and the failure this is for (a generator
 * emitting the same question twice with a word changed) is caught by overlap. The
 * threshold is tuned to flag rather than to be certain, which is the whole posture here.
 */
export function similarity(a: string, b: string): number {
  const wa = new Set(normalise(a).split(' ').filter((w) => w.length > 2));
  const wb = new Set(normalise(b).split(' ').filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.min(wa.size, wb.size);
}

/** Above this, two stems are flagged as probable duplicates. */
export const DUPLICATE_AT = 0.8;
/** A stem shorter than this cannot be a question. */
export const MIN_STEM_WORDS = 3;

/**
 * Check one question in isolation.
 *
 * The incomplete and unsolvable checks are the ones that genuinely matter: they catch
 * papers that cost students marks for the author's mistake, and they are decidable from
 * the text alone, which is why they are BLOCKING rather than advisory.
 */
export function checkQuestion(q: CheckableQuestion): QuestionIssue[] {
  const issues: QuestionIssue[] = [];
  const stem = (q.stem ?? '').trim();

  if (stem.length === 0 || normalise(stem).split(' ').filter(Boolean).length < MIN_STEM_WORDS) {
    issues.push({
      questionId: q.id,
      flag: QuestionFlag.INCOMPLETE,
      severity: FlagSeverity.BLOCKING,
      message: 'The question text is too short to be a question.',
    });
  }

  // A stem that trails off mid-sentence is the commonest generation failure.
  if (/[,;:]$/.test(stem) || /\b(and|or|the|a|an|of|to|is|are|with|for)$/i.test(stem)) {
    issues.push({
      questionId: q.id,
      flag: QuestionFlag.INCOMPLETE,
      severity: FlagSeverity.BLOCKING,
      message: 'The question text appears to be cut off mid-sentence.',
    });
  }

  if (q.options.length > 0) {
    if (q.options.length < 2) {
      issues.push({
        questionId: q.id,
        flag: QuestionFlag.INCOMPLETE,
        severity: FlagSeverity.BLOCKING,
        message: 'A multiple-choice question needs at least two options.',
      });
    }

    const blank = q.options.filter((o) => !(o.text ?? '').trim()).length;
    if (blank > 0) {
      issues.push({
        questionId: q.id,
        flag: QuestionFlag.INCOMPLETE,
        severity: FlagSeverity.BLOCKING,
        message: `${blank} option${blank === 1 ? ' is' : 's are'} blank.`,
      });
    }

    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) {
      issues.push({
        questionId: q.id,
        flag: QuestionFlag.UNSOLVABLE,
        severity: FlagSeverity.BLOCKING,
        message: 'No option is marked correct, so nobody can answer this correctly.',
      });
    }
    if (correct > 1 && !q.multiSelect) {
      // The specific failure: the student picks a right answer and is marked wrong
      // because only one of the two correct rows carries the flag.
      issues.push({
        questionId: q.id,
        flag: QuestionFlag.UNSOLVABLE,
        severity: FlagSeverity.BLOCKING,
        message: `${correct} options are marked correct on a single-answer question — a student picking the other right answer would be marked wrong.`,
      });
    }

    // Two options a student cannot tell apart: whichever they pick, the question is
    // testing their luck.
    for (let i = 0; i < q.options.length; i++) {
      for (let j = i + 1; j < q.options.length; j++) {
        const a = normalise(q.options[i].text);
        const b = normalise(q.options[j].text);
        if (a && a === b) {
          issues.push({
            questionId: q.id,
            flag: QuestionFlag.UNSOLVABLE,
            severity: FlagSeverity.BLOCKING,
            message: `Two options are identical ("${q.options[i].text.slice(0, 40)}").`,
          });
        } else if (a && b && similarity(a, b) >= 0.95) {
          issues.push({
            questionId: q.id,
            flag: QuestionFlag.AMBIGUOUS,
            severity: FlagSeverity.REVIEW,
            message: `Two options are almost identical — check a student can tell them apart.`,
          });
        }
      }
    }

    // "All of the above" with a single correct answer elsewhere is a common generated
    // contradiction. Flagged for review rather than blocked, because it is sometimes the
    // intended answer.
    const catchAll = q.options.find((o) => /\b(all|none) of the above\b/i.test(o.text ?? ''));
    if (catchAll && !catchAll.isCorrect && correct >= 1) {
      issues.push({
        questionId: q.id,
        flag: QuestionFlag.AMBIGUOUS,
        severity: FlagSeverity.REVIEW,
        message: `"${catchAll.text.trim()}" is offered but not correct — check it is not actually true.`,
      });
    }
  }

  /**
   * A negated stem with no emphasis. Students miss the "not" and lose the mark for
   * reading quickly rather than for not knowing — flagged for review, not blocked,
   * because a negated question is sometimes precisely the right one to ask.
   */
  if (/\b(not|except|incorrect|false)\b/.test(stem) && !/NOT|EXCEPT|INCORRECT|FALSE/.test(stem)) {
    issues.push({
      questionId: q.id,
      flag: QuestionFlag.AMBIGUOUS,
      severity: FlagSeverity.REVIEW,
      message: 'The question is negated but the negation is not emphasised — consider capitalising it.',
    });
  }

  return issues;
}

/**
 * Check a whole paper, including the pairwise duplicate scan.
 *
 * Returns the issues and a summary that separates blocking from advisory, so a workflow
 * can refuse to publish on the first and merely surface the second.
 */
export function checkQuestionSet(questions: readonly CheckableQuestion[]): {
  issues: QuestionIssue[];
  blocking: number;
  review: number;
  /** Questions with no issue at all — the number worth seeing, so a long list of flags
   *  does not read as "the whole paper is broken". */
  clean: number;
} {
  const issues: QuestionIssue[] = [];
  for (const q of questions) issues.push(...checkQuestion(q));

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const s = similarity(questions[i].stem, questions[j].stem);
      if (s >= DUPLICATE_AT) {
        issues.push({
          questionId: questions[i].id,
          relatedQuestionId: questions[j].id,
          flag: QuestionFlag.DUPLICATE,
          severity: FlagSeverity.REVIEW,
          // Reviewed, not removed: two similar questions are sometimes a deliberate pair
          // at different difficulties.
          message: `Reads almost the same as another question in this set (${Math.round(s * 100)}% word overlap).`,
        });
      }
    }
  }

  const flagged = new Set(issues.map((i) => i.questionId));
  return {
    issues,
    blocking: issues.filter((i) => i.severity === FlagSeverity.BLOCKING).length,
    review: issues.filter((i) => i.severity === FlagSeverity.REVIEW).length,
    clean: questions.filter((q) => !flagged.has(q.id)).length,
  };
}
