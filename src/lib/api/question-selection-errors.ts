import { ApiRequestError, describeApiError } from './types';
import type {
  DuplicateQuestionIdsDetails,
  InvalidQuestionIdsDetails,
  QUESTION_SELECTION_ERRORS as SharedSelectionErrors,
} from '@/shared/dto/assessment-builder.dto';

/**
 * Question-selection error codes (shared contract, assessment-builder.dto.ts) turned into
 * something a screen can act on: which ids to flag and a plain-language message.
 *
 *   INVALID_QUESTION_IDS   400  details: ids grouped by reason
 *   DUPLICATE_QUESTION_IDS 400  details: repeated ids / ids already in the assessment
 *   QUESTION_SET_LOCKED    409  details: { mockTestId, attempts }
 *   CODING_PROBLEM_IN_USE  409  a linked coding problem can't be deleted
 *   QUESTION_IN_USE        409  structural option change on an attempted question
 */

/** The contract's codes, re-declared locally so the DTO module (and its class-validator
 *  decorators) stays type-only on the client; `satisfies` keeps it in lock-step. */
export const QUESTION_SELECTION_ERRORS = {
  INVALID_QUESTION_IDS: 'INVALID_QUESTION_IDS',
  DUPLICATE_QUESTION_IDS: 'DUPLICATE_QUESTION_IDS',
  QUESTION_SET_LOCKED: 'QUESTION_SET_LOCKED',
  CODING_PROBLEM_IN_USE: 'CODING_PROBLEM_IN_USE',
  QUESTION_IN_USE: 'QUESTION_IN_USE',
} as const satisfies typeof SharedSelectionErrors;

/** One reason the server refused a group of ids. */
export interface FlaggedIdGroup {
  /** Plain-language reason, e.g. "No longer published". */
  reason: string;
  ids: string[];
}

export type SelectionErrorKind = 'INVALID' | 'DUPLICATE' | 'LOCKED' | 'FORBIDDEN' | 'OTHER';

export interface SelectionError {
  kind: SelectionErrorKind;
  message: string;
  /** Offending ids by reason (INVALID / DUPLICATE only). */
  groups: FlaggedIdGroup[];
}

const INVALID_REASONS: Array<[keyof InvalidQuestionIdsDetails, string]> = [
  ['questionNotFound', 'Question no longer exists'],
  ['questionNotPublished', 'Question is not published (draft or archived)'],
  ['questionUnsupportedType', 'Question type can’t be graded in an assessment'],
  ['codingNotFound', 'Coding problem no longer exists'],
  ['codingInactive', 'Coding problem is deactivated'],
];

const DUPLICATE_REASONS: Array<[keyof DuplicateQuestionIdsDetails, string]> = [
  ['duplicateQuestionIds', 'Question picked more than once'],
  ['duplicateCodingProblemIds', 'Coding problem picked more than once'],
  ['questionIdsAlreadyInAssessment', 'Question is already in this assessment'],
  ['codingProblemIdsAlreadyInAssessment', 'Coding problem is already in this assessment'],
];

function groupsFrom<T extends object>(details: unknown, reasons: Array<[keyof T, string]>): FlaggedIdGroup[] {
  if (!details || typeof details !== 'object') return [];
  const d = details as Record<string, unknown>;
  return reasons
    .map(([key, reason]) => {
      const v = d[key as string];
      const ids = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
      return { reason, ids };
    })
    .filter((g) => g.ids.length > 0);
}

/** Attempts count from a QUESTION_SET_LOCKED `details`, when present. */
function lockedAttempts(details: unknown): number | null {
  if (!details || typeof details !== 'object') return null;
  const n = (details as { attempts?: unknown }).attempts;
  return typeof n === 'number' ? n : null;
}

/** Classify an error thrown by the builder's create / append / sample calls. */
export function parseSelectionError(err: unknown, fallback: string): SelectionError {
  if (!(err instanceof ApiRequestError)) return { kind: 'OTHER', message: fallback, groups: [] };
  switch (err.code) {
    case QUESTION_SELECTION_ERRORS.INVALID_QUESTION_IDS:
      return {
        kind: 'INVALID',
        message: 'Some selected questions can no longer be used. Remove them, then publish again.',
        groups: groupsFrom<InvalidQuestionIdsDetails>(err.details, INVALID_REASONS),
      };
    case QUESTION_SELECTION_ERRORS.DUPLICATE_QUESTION_IDS:
      return {
        kind: 'DUPLICATE',
        message: 'Some questions appear more than once. Remove the repeats, then publish again.',
        groups: groupsFrom<DuplicateQuestionIdsDetails>(err.details, DUPLICATE_REASONS),
      };
    case QUESTION_SELECTION_ERRORS.QUESTION_SET_LOCKED:
      return { kind: 'LOCKED', message: questionSetLockedMessage(err.details), groups: [] };
    default:
      if (err.status === 403 || err.code === 'FORBIDDEN') {
        return {
          kind: 'FORBIDDEN',
          message: err.message && err.message !== 'Forbidden' ? err.message : 'You don’t have permission to do this.',
          groups: [],
        };
      }
      return { kind: 'OTHER', message: describeApiError(err, fallback), groups: [] };
  }
}

function questionSetLockedMessage(details: unknown): string {
  const attempts = lockedAttempts(details);
  const who = attempts ? `${attempts} student attempt${attempts === 1 ? '' : 's'}` : 'student attempts';
  return `This assessment already has ${who}, so its questions are locked. Scores are graded against this exact set — you can still edit the schedule and settings, but not the questions.`;
}

/**
 * A message for the EXISTING admin flows that now hit the freeze guards (Mocks console,
 * scheduled-assessment edit, coding-problem delete, question drawer). Falls back to the
 * server's message for anything else.
 */
export function describeQuestionSetError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiRequestError)) return fallback;
  switch (err.code) {
    case QUESTION_SELECTION_ERRORS.QUESTION_SET_LOCKED:
      return questionSetLockedMessage(err.details);
    case QUESTION_SELECTION_ERRORS.CODING_PROBLEM_IN_USE:
      return 'This coding problem is used in an assessment or mock, so it can’t be deleted. Deactivate it instead — it can no longer be added to new assessments, and existing attempts keep their results.';
    case QUESTION_SELECTION_ERRORS.QUESTION_IN_USE:
      return 'Students have already attempted a mock with this question, so its options can’t be restructured (added, removed, or reordered while re-wording several). You can still fix option text or the answer key with the same options; otherwise archive it and create a corrected copy.';
    case QUESTION_SELECTION_ERRORS.DUPLICATE_QUESTION_IDS:
    case QUESTION_SELECTION_ERRORS.INVALID_QUESTION_IDS:
      return err.message || fallback;
    default:
      return describeApiError(err, fallback);
  }
}

export function isQuestionSelectionCode(err: unknown, code: keyof typeof QUESTION_SELECTION_ERRORS): boolean {
  return err instanceof ApiRequestError && err.code === QUESTION_SELECTION_ERRORS[code];
}
