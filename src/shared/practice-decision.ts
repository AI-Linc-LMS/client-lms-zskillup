/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * WHAT THE PLATFORM MEASURED, AND WHAT A PERSON DECIDED (PRD §23.5, §23.7).
 *
 * §23.5 ends with the requirement that shapes this whole file:
 *
 *   "RECORD THE TPO/ZSKILLUP DECISION SEPARATELY FROM THE ASSESSMENT RESULT so that the
 *    system retains BOTH the measured performance and the human decision."
 *
 * Those are different kinds of fact and they belong in different places. A score is a
 * measurement — reproducible, attributable to an attempt, and not an opinion. "Ready for
 * the next round" is a judgement somebody made on a Tuesday, possibly against the score.
 * Storing the second on top of the first destroys the only record of what was actually
 * measured, and storing only the first leaves nobody accountable for the decision.
 *
 * A PRACTICE DECISION IS NOT A HIRING STAGE. §23.7 is explicit: "keep the hiring-round
 * status separate from practice-assessment status. Completing practice does not
 * automatically mean a candidate has passed the employer's actual round." §10 owns the
 * hiring pipeline and already records who moved a candidate, when and why. But "hold for
 * coaching" and "ask them to retake the practice" are not hiring stages at all — a
 * candidate held for coaching has not been held in the employer's process — so putting
 * them through §10 would misreport the candidate's position to the employer and to the
 * student.
 *
 * A RECOMMENDATION IS NOT A DECISION. §23.5: "allow configurable score thresholds and
 * recommendations such as 'ready for next round', 'practice recommended' or 'manual review
 * required'. RECOMMENDATIONS MUST NOT AUTOMATICALLY REJECT A CANDIDATE unless the
 * authorised operator has explicitly enabled a transparent rule." So a recommendation is
 * computed and advisory; a decision is typed by a person and recorded with their name.
 * The same split §6 makes between a match score and what anybody does about it.
 */

/** What the thresholds suggest. Advisory, always. */
export enum PracticeRecommendation {
  /** Comfortably above the bar. */
  READY = 'READY',
  /** Near the bar — worth a look, not a conclusion. */
  BORDERLINE = 'BORDERLINE',
  /** Below the bar; practice would help before the real round. */
  PRACTICE_RECOMMENDED = 'PRACTICE_RECOMMENDED',
  /**
   * Nothing to go on. NOT a low score — the platform could not measure them, and on this
   * platform that is common. §6's rule, applied to practice.
   */
  NOT_ENOUGH_DATA = 'NOT_ENOUGH_DATA',
  /** Something does not add up — an abandoned attempt, a proctoring flag, a clash. */
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export const RECOMMENDATION_LABELS: Readonly<Record<PracticeRecommendation, string>> = {
  [PracticeRecommendation.READY]: 'Ready for the next round',
  [PracticeRecommendation.BORDERLINE]: 'Borderline — worth a look',
  [PracticeRecommendation.PRACTICE_RECOMMENDED]: 'Practice recommended first',
  [PracticeRecommendation.NOT_ENOUGH_DATA]: 'Not enough data to judge',
  [PracticeRecommendation.MANUAL_REVIEW]: 'Needs a human to look',
};

/** What a person actually decided. Typed by a human, never computed. */
export enum PracticeDecision {
  /** Put them through to the next hiring round. Acted on via §10, recorded here. */
  ADVANCE = 'ADVANCE',
  /** Keep them in, but coach first. NOT a hiring hold. */
  HOLD_FOR_COACHING = 'HOLD_FOR_COACHING',
  /** Let them sit the practice again. */
  RETAKE = 'RETAKE',
  /** Assign more practice before deciding. */
  MORE_PRACTICE = 'MORE_PRACTICE',
  /** Not taking them forward. Acted on via §10, recorded here. */
  DO_NOT_ADVANCE = 'DO_NOT_ADVANCE',
  /** Looked at, no decision yet — an honest state, and better than a stale blank. */
  REVIEWED_NO_DECISION = 'REVIEWED_NO_DECISION',
}

export const DECISION_LABELS: Readonly<Record<PracticeDecision, string>> = {
  [PracticeDecision.ADVANCE]: 'Advance to the next round',
  [PracticeDecision.HOLD_FOR_COACHING]: 'Hold for coaching',
  [PracticeDecision.RETAKE]: 'Ask them to retake',
  [PracticeDecision.MORE_PRACTICE]: 'Assign more practice',
  [PracticeDecision.DO_NOT_ADVANCE]: 'Do not advance',
  [PracticeDecision.REVIEWED_NO_DECISION]: 'Reviewed, no decision yet',
};

/**
 * Decisions that change a candidate's position in the EMPLOYER'S process, and so must
 * also go through §10's pipeline.
 *
 * The others are practice-side only. A candidate held for coaching is still exactly where
 * they were in the hiring process, and saying otherwise would misreport them to the
 * employer and to themselves.
 */
export const DECISIONS_AFFECTING_HIRING: readonly PracticeDecision[] = [
  PracticeDecision.ADVANCE,
  PracticeDecision.DO_NOT_ADVANCE,
] as const;

/** Decisions a candidate will be told about, so they need a written reason. */
export const DECISION_REASON_REQUIRED: readonly PracticeDecision[] = [
  PracticeDecision.DO_NOT_ADVANCE,
  PracticeDecision.HOLD_FOR_COACHING,
  PracticeDecision.RETAKE,
] as const;

/** The thresholds an operator configures per round. */
export interface RecommendationThresholds {
  /** At or above this, READY. */
  readyAt: number;
  /** At or above this but below readyAt, BORDERLINE. */
  borderlineAt: number;
}

export const DEFAULT_THRESHOLDS: RecommendationThresholds = { readyAt: 70, borderlineAt: 50 };

/**
 * What the thresholds say about one result.
 *
 * NULL SCORE IS NEVER A LOW SCORE. An unattempted or unscored assessment returns
 * NOT_ENOUGH_DATA, not PRACTICE_RECOMMENDED — the same rule as §6's coverage floor and
 * §15's null sorting. Treating "we did not measure this" as "they did badly" is the single
 * most common way this platform's data could be used to misjudge a student.
 */
export function recommend(
  input: {
    /** 0–100, or null when unattempted or unscored. */
    score: number | null;
    /** True when a person must score it before any number exists (§23.3). */
    needsHumanScoring?: boolean;
    /** An attempt that was started and never submitted. */
    abandoned?: boolean;
    /** Proctoring or integrity flags on the attempt. */
    flagged?: boolean;
  },
  thresholds: RecommendationThresholds = DEFAULT_THRESHOLDS,
): PracticeRecommendation {
  // A flag or an abandoned attempt outranks the number: both mean the score, whatever it
  // is, does not describe what happened.
  if (input.flagged || input.abandoned) return PracticeRecommendation.MANUAL_REVIEW;

  // A round only a person can score has no automatic verdict, and inventing one would be
  // §23.3's auto-scoring confusion in a different coat.
  if (input.needsHumanScoring) return PracticeRecommendation.MANUAL_REVIEW;

  if (input.score === null || input.score === undefined) {
    return PracticeRecommendation.NOT_ENOUGH_DATA;
  }
  if (input.score >= thresholds.readyAt) return PracticeRecommendation.READY;
  if (input.score >= thresholds.borderlineAt) return PracticeRecommendation.BORDERLINE;
  return PracticeRecommendation.PRACTICE_RECOMMENDED;
}

export interface ThresholdProblem {
  code: 'ORDER' | 'RANGE';
  message: string;
}

export function checkThresholds(t: RecommendationThresholds): ThresholdProblem | null {
  for (const v of [t.readyAt, t.borderlineAt]) {
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return { code: 'RANGE', message: 'Thresholds must be between 0 and 100.' };
    }
  }
  if (t.borderlineAt >= t.readyAt) {
    // Otherwise BORDERLINE is unreachable and the middle band silently disappears.
    return {
      code: 'ORDER',
      message: 'The borderline threshold has to be below the ready threshold.',
    };
  }
  return null;
}

export interface DecisionProblem {
  code: 'REASON_REQUIRED' | 'NO_RESULT_TO_DECIDE_ON';
  message: string;
}

export function checkDecision(input: {
  decision: PracticeDecision;
  reason?: string | null;
  /** Whether this candidate has any practice result at all. */
  hasResult: boolean;
}): DecisionProblem | null {
  if (DECISION_REASON_REQUIRED.includes(input.decision) && !(input.reason ?? '').trim()) {
    return {
      code: 'REASON_REQUIRED',
      message: `${DECISION_LABELS[input.decision]} needs a reason — the candidate will be told, and will ask.`,
    };
  }
  /**
   * Deciding on the back of a result that does not exist is the error worth catching
   * here. It is not forbidden — a team may legitimately advance somebody who never sat
   * the practice — but it must be deliberate, and ADVANCE/REVIEWED are the only ones that
   * make sense without one. Asking somebody to RETAKE an assessment they never started is
   * a mistake every time.
   */
  if (!input.hasResult && input.decision === PracticeDecision.RETAKE) {
    return {
      code: 'NO_RESULT_TO_DECIDE_ON',
      message: 'This candidate has not attempted it yet, so there is nothing to retake.',
    };
  }
  return null;
}

/**
 * One candidate's row on the monitoring dashboard (PRD §23.5).
 *
 * The measured half and the decided half sit SIDE BY SIDE and neither overwrites the
 * other, which is the whole requirement. `components` exists because §23.5 asks to
 * "compare results across candidates WITHOUT RELYING ONLY ON ONE OVERALL SCORE" — a
 * single number hides a candidate who is strong on technical and lost on verbal, which is
 * exactly the candidate a coaching decision is about.
 */
export interface CandidatePracticeRow {
  userId: string;
  name: string | null;
  /* ── measured ───────────────────────────────────────────────────────────── */
  score: number | null;
  /** Section-level breakdown, never collapsed into the total. */
  components: Array<{ label: string; score: number | null; of: number | null }>;
  attempts: number;
  startedAt: string | null;
  submittedAt: string | null;
  timeTakenSec: number | null
  abandoned: boolean;
  flagged: boolean;
  /** Advisory only. */
  recommendation: PracticeRecommendation;
  /* ── decided ────────────────────────────────────────────────────────────── */
  decision: PracticeDecision | null;
  decisionReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  /** True when the person decided AGAINST the recommendation — worth surfacing, never
   *  worth preventing. §23.5 asks for the override reason to be visible. */
  decisionDivergesFromRecommendation: boolean;
}

/** Does the decision go against what the thresholds suggested? */
export function divergesFromRecommendation(
  recommendation: PracticeRecommendation,
  decision: PracticeDecision | null,
): boolean {
  if (!decision) return false;
  if (decision === PracticeDecision.ADVANCE) {
    return recommendation === PracticeRecommendation.PRACTICE_RECOMMENDED;
  }
  if (decision === PracticeDecision.DO_NOT_ADVANCE) {
    return recommendation === PracticeRecommendation.READY;
  }
  return false;
}
