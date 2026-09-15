/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at backend-repo/src/shared/question-taxonomy.ts.
 *
 * Every question in the bank is labelled Company → Section → Topic → Question Type.
 * MCQ-style questions take their Section and Topic from the topic tree. Coding problems
 * live in the separate Judge0 bank (no topic tree), so their Section is the fixed
 * CODING_SECTION_LABEL, their Topic is the problem's primary tag (tags[0]) and their
 * Question Type is always CODING.
 *
 * Display labels only: routes, slugs and payment scope refs stay 'coding'.
 */
import type { QuestionType } from './enums';

/** The coding section's name, wherever a SECTION is shown to admins or students. */
export const CODING_SECTION_LABEL = 'Coding / Programming';

/** The question type every coding problem carries (GET /admin/coding/problems rows). */
export const CODING_QUESTION_TYPE = 'CODING' satisfies `${QuestionType.CODING}`;

/** Question type → display label. */
export const QUESTION_TYPE_LABEL: Record<`${QuestionType}`, string> = {
  MCQ: 'MCQ',
  MULTI_SELECT: 'Multi-select',
  NUMERIC: 'Numeric',
  CODING: 'Coding',
};
