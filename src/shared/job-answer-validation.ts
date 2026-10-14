import { JobQuestionKind } from './enums';

/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * IS THIS A VALID ANSWER TO THIS QUESTION? (PRD §9)
 *
 * The form is a convenience; answers arrive in a request body, so this is the rule. It
 * lives in shared/ because the client needs to say the same thing before submitting as
 * the server says on receiving it — a client that accepts what the API rejects produces a
 * student staring at a form with no visible problem.
 *
 * The three kinds §9 added are the ones with real rules:
 *
 *   YES_NO    one of two values, not free text. The whole point of the kind is that an
 *             answer can feed a hard eligibility rule without anybody parsing prose.
 *   CONSENT   must be AFFIRMATIVE to count. A consent question storing "no" is not
 *             consent, it is a refusal recorded in a box labelled consent — and §17
 *             requires consent to be evidenced, which means it has to mean something.
 *   FILE      must look like a URL, because the answer is the uploaded document's
 *             location and a filename alone is unreachable later.
 */

export const YES = 'YES';
export const NO = 'NO';

/** Problem with an answer, or null when it is fine. */
export function validateAnswer(
  kind: JobQuestionKind | string | null | undefined,
  answer: string,
  options: readonly string[] = [],
): string | null {
  const value = (answer ?? '').trim();
  if (!value) return null; // emptiness is the "required" check's business, not this one.

  switch (kind) {
    case JobQuestionKind.YES_NO:
      return [YES, NO].includes(value.toUpperCase()) ? null : 'Answer yes or no';

    case JobQuestionKind.CONSENT:
      // Deliberately not "one of yes/no": an unticked consent box is a missing answer,
      // and a recorded "NO" would make a refusal look like a completed field.
      return value.toUpperCase() === YES ? null : 'This has to be agreed to before applying';

    case JobQuestionKind.FILE:
      return /^https?:\/\/\S+$/i.test(value) ? null : 'Upload a file first';

    case JobQuestionKind.NUMBER:
      return Number.isFinite(Number(value)) ? null : 'Enter a number';

    case JobQuestionKind.EMAIL:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Enter a valid email address';

    case JobQuestionKind.URL:
      return /^https?:\/\/\S+$/i.test(value) ? null : 'Enter a valid link';

    case JobQuestionKind.DATE:
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Enter a date';

    case JobQuestionKind.SELECT:
      return options.length === 0 || options.some((o) => o === value)
        ? null
        : 'Choose one of the listed options';

    case JobQuestionKind.MULTI_SELECT: {
      if (options.length === 0) return null;
      const chosen = value.split(',').map((v) => v.trim()).filter(Boolean);
      return chosen.every((c) => options.includes(c))
        ? null
        : 'Choose from the listed options';
    }

    default:
      return null; // TEXT, LONG_TEXT, PHONE — nothing to enforce beyond presence.
  }
}

/** Kinds whose answer is a yes/no the eligibility rules can read directly. */
export function asBoolean(kind: JobQuestionKind | string, answer: string): boolean | null {
  if (kind !== JobQuestionKind.YES_NO && kind !== JobQuestionKind.CONSENT) return null;
  const v = (answer ?? '').trim().toUpperCase();
  return v === YES ? true : v === NO ? false : null;
}
