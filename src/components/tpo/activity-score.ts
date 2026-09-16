/**
 * "Activity Score" - the ONE user-facing name for the field the API still calls
 * `participation` (kept for contract stability, ADR-011).
 *
 * The number is `practice answers + 3x mock attempts + 2x distinct coding problems`:
 * a weighted engagement VOLUME, not attendance, and it is not comparable to a
 * percentage. Every label, caption and CSV heading pulls from here so the console,
 * the drawer, the admin panel and both exports cannot describe it differently. The
 * caption travels with the label wherever there is room, because the formula is the
 * only thing that makes the number interpretable.
 */

export const ACTIVITY_SCORE_LABEL = 'Activity Score';

/** Short provenance line - fits under a heading or inside a ProvenanceChip. */
export const ACTIVITY_SCORE_CAPTION = 'practice answers + 3x mocks + 2x coding problems';

/** Full sentence for the explainer card and tooltips. */
export const ACTIVITY_SCORE_EXPLAINER =
  'Activity Score = practice questions answered + 3x mock tests + 2x distinct coding problems. It measures how much a student has engaged, not how well they scored, and it is a count - not a percentage.';

/** CSV heading - byte-identical to the backend's emailed college report (ACTIVITY_SCORE_HEADER). */
export const ACTIVITY_SCORE_CSV_HEADER =
  'Activity Score (practice answers + 3x mocks + 2x coding)';

/** One-line breakdown for a single student, for `title=` tooltips and drawers. */
export function activityScoreBreakdown(components: {
  practiceAnswered: number;
  mocksCompleted: number;
  codingProblems: number;
}): string {
  return `${components.practiceAnswered} practice answers + 3x${components.mocksCompleted} mocks + 2x${components.codingProblems} coding problems`;
}
