/**
 * Mock-interview evaluations that were graded by the length-based FALLBACK (because AI
 * grading failed) were stored with feedback written for whoever operates the platform,
 * not for the person reading it: "This is a length-based estimate. Configure AI
 * (OPENAI_API_KEY) for a full, rubric-anchored evaluation."
 *
 * The backend no longer writes that copy, but it is already sitting in the database on
 * every interview graded during the outage - so it has to be filtered on the way to the
 * screen too, on the student's result page and in the TPO transcript drawer alike.
 */
const OPERATOR_ONLY_COPY = /OPENAI_API_KEY|enable ai evaluation|length-based estimate|configure ai/i;

/** What to show a learner when the stored feedback was never meant for them. */
export const NO_BREAKDOWN_FEEDBACK =
  'A detailed breakdown is not available for this interview - this score reflects how fully each question was answered.';

/** The stored text, or `fallback` when it was written for an operator rather than a reader. */
export function learnerCopy(text: string | null | undefined, fallback: string): string {
  const t = (text ?? '').trim();
  return !t || OPERATOR_ONLY_COPY.test(t) ? fallback : t;
}
