/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * DID THE PRACTICE PREDICT THE REAL OUTCOME? (PRD §23.7)
 *
 * §23.7's last requirement, and the one that makes the whole engine improvable:
 *
 *   "TRACK WHETHER THE ACTUAL EMPLOYER OUTCOME ALIGNS WITH PRACTICE RESULTS, where the
 *    outcome data is available, so the team can improve future assessment templates and
 *    readiness indicators."
 *
 * This is a calibration report: of the candidates our practice called ready, how many
 * actually cleared the employer's round? Of the ones it told to practise more, how many
 * cleared it anyway?
 *
 * THE HARD PART IS NOT THE ARITHMETIC. IT IS REFUSING TO OVERCLAIM. A calibration figure
 * computed over six candidates is noise wearing a percentage sign, and it would be read as
 * evidence about the assessment. So:
 *
 *   1. ONLY CANDIDATES WITH BOTH HALVES ARE COMPARED, and the ones excluded are COUNTED
 *      AND REPORTED. A candidate who never sat the practice, or whose employer outcome
 *      was never recorded, tells you nothing about alignment — but a report that silently
 *      dropped them would show a confident number computed over whoever happened to have
 *      complete data, which is the least representative group available.
 *
 *   2. BELOW A MINIMUM SAMPLE, NO RATE IS REPORTED AT ALL. Not a rate with a caveat — no
 *      rate. A number on screen gets quoted; a caveat beside it does not travel with it.
 *
 *   3. EVERY RATE CARRIES ITS DENOMINATOR, as everywhere since §14.
 *
 * And the conclusion this report CANNOT support is worth saying out loud: a poorly
 * calibrated practice assessment might mean the questions are wrong, or that the employer's
 * round tests something else entirely, or that the cohort improved in between. The report
 * says what happened; it does not diagnose why.
 */

import { type Rate, rate } from './placement-analytics';
import { PracticeRecommendation } from './practice-decision';

/**
 * The fewest paired candidates worth quoting a rate over.
 *
 * Twenty is a judgement, not a statistic — small enough to be reachable by a single
 * college drive, large enough that one unusual candidate cannot move the figure by five
 * points. The point is to have a line at all: without one, the first drive to finish
 * produces a 100% alignment claim from three people.
 */
export const MIN_PAIRED_FOR_RATE = 20;

/** What actually happened to a candidate at the employer's round. */
export enum ActualOutcome {
  /** Progressed past this round. */
  CLEARED = 'CLEARED',
  /** Did not progress past this round. */
  NOT_CLEARED = 'NOT_CLEARED',
}

/** One candidate with both halves on record. */
export interface PairedResult {
  userId: string;
  /** What the practice thresholds said. */
  predicted: PracticeRecommendation;
  /** What the employer's round actually did. */
  actual: ActualOutcome;
}

/**
 * Which recommendations amount to a prediction of clearing.
 *
 * NOT_ENOUGH_DATA and MANUAL_REVIEW are deliberately absent: neither is a prediction, so
 * neither can be right or wrong. Counting them as predictions — in either direction —
 * would make the platform's missing data look like a forecasting failure, which is the
 * §6 error in a new place.
 */
export const PREDICTS_CLEARED: readonly PracticeRecommendation[] = [
  PracticeRecommendation.READY,
] as const;

export const PREDICTS_NOT_CLEARED: readonly PracticeRecommendation[] = [
  PracticeRecommendation.PRACTICE_RECOMMENDED,
] as const;

/** Recommendations that make no claim either way. */
export const PREDICTS_NOTHING: readonly PracticeRecommendation[] = [
  PracticeRecommendation.BORDERLINE,
  PracticeRecommendation.NOT_ENOUGH_DATA,
  PracticeRecommendation.MANUAL_REVIEW,
] as const;

export interface CalibrationReport {
  /** Candidates with a practice result AND a recorded employer outcome. */
  paired: number;
  /** Of those, how many the practice actually made a claim about. */
  predictive: number;
  /** Named reasons a candidate could not be paired — see rule 1 in the header. */
  excluded: {
    noPracticeResult: number;
    noRecordedOutcome: number;
    /** Practice ran but made no claim (borderline, unmeasured, flagged). */
    noPrediction: number;
  };
  /**
   * The four cells, counted. Null rates below the sample floor rather than small-sample
   * percentages — see rule 2.
   */
  saidReady: { cleared: number; notCleared: number; accuracy: Rate | null };
  saidPractise: { cleared: number; notCleared: number; accuracy: Rate | null };
  /** Agreement across every predictive pair. Null below the floor. */
  overallAgreement: Rate | null;
  /** True when there is not yet enough paired data to say anything. */
  tooEarlyToTell: boolean;
  /** What this report cannot tell you, carried with it so it travels. */
  caveat: string;
}

export function calibrate(results: readonly PairedResult[]): CalibrationReport {
  const predictive = results.filter(
    (r) => PREDICTS_CLEARED.includes(r.predicted) || PREDICTS_NOT_CLEARED.includes(r.predicted),
  );
  const noPrediction = results.length - predictive.length;

  const ready = predictive.filter((r) => PREDICTS_CLEARED.includes(r.predicted));
  const practise = predictive.filter((r) => PREDICTS_NOT_CLEARED.includes(r.predicted));

  const readyCleared = ready.filter((r) => r.actual === ActualOutcome.CLEARED).length;
  const practiseCleared = practise.filter((r) => r.actual === ActualOutcome.CLEARED).length;

  const enough = predictive.length >= MIN_PAIRED_FOR_RATE;
  const agreed = readyCleared + (practise.length - practiseCleared);

  return {
    paired: results.length,
    predictive: predictive.length,
    excluded: { noPracticeResult: 0, noRecordedOutcome: 0, noPrediction },
    saidReady: {
      cleared: readyCleared,
      notCleared: ready.length - readyCleared,
      // No rate at all below the floor — a number on screen gets quoted, a caveat does
      // not travel with it.
      accuracy: enough ? rate(readyCleared, ready.length, 'candidates called ready') : null,
    },
    saidPractise: {
      cleared: practiseCleared,
      notCleared: practise.length - practiseCleared,
      accuracy: enough
        ? rate(practise.length - practiseCleared, practise.length, 'candidates told to practise')
        : null,
    },
    overallAgreement: enough
      ? rate(agreed, predictive.length, 'candidates the practice made a call on')
      : null,
    tooEarlyToTell: !enough,
    caveat:
      'This compares what the practice predicted against what the employer did. Where they disagree it does not say why — the questions may be testing the wrong thing, the employer’s round may test something else entirely, or the cohort may have improved in between.',
  };
}
