/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * THE CANDIDATE-FIT SCORE (PRD §6 "Matching engine and candidate-fit view").
 *
 * Hard eligibility (shared/drive-eligibility.ts) decides who MAY be considered. This
 * decides, among those, who looks like a fit — and the PRD is emphatic that the two never
 * merge: "a high score cannot override a failed mandatory criterion unless an authorised
 * user explicitly overrides it".
 *
 * Four rules this file exists to enforce, each of which is a way a scoring engine quietly
 * does harm:
 *
 *   1. MISSING IS NOT ZERO. "Do not silently treat missing scores as zero." A student who
 *      has never sat a mock interview has not scored 0% on communication; nobody has
 *      measured them. A missing component is DROPPED and the remaining weights are
 *      renormalised, so the score means "out of what we actually know". The alternative
 *      ranks the unmeasured below the measured-and-poor, which is the opposite of true.
 *      This is not hypothetical here: on this platform communication and interview
 *      readiness are each measured for under 1% of active students.
 *
 *   2. A SCORE SHOWS ITS WORKING. Every component carries its source, the date it was
 *      measured, its weight and its contribution. "72%" with no provenance cannot be
 *      argued with by a student or defended by a TPO.
 *
 *   3. COVERAGE IS PART OF THE ANSWER. A 90% built from one component out of six is not
 *      the same claim as a 90% built from all six, and a table that renders them
 *      identically is lying by omission. Every result carries how much of the intended
 *      weight was actually measurable.
 *
 *   4. NO OPAQUE SCORE DECIDES ALONE. "Do not use a single opaque AI score as the sole
 *      basis for exclusion." The score is decision support; `recommendation` is advisory
 *      wording, never an action, and overrides are recorded with who and why.
 */

/** The dimensions a drive can weight. Mirrors the PRD's table in §6. */
export enum MatchDimension {
  /** Quantitative, logical and verbal — the aptitude topic roots. */
  APTITUDE = 'APTITUDE',
  /** Technical MCQs, coding and domain practice. */
  TECHNICAL = 'TECHNICAL',
  /** Spoken/business communication — interview rubric plus soft-skills practice. */
  COMMUNICATION = 'COMMUNICATION',
  /** JD-to-resume skill overlap, and whether a resume exists at all. */
  RESUME = 'RESUME',
  /** AI mock interview and professional readiness. */
  INTERVIEW_READINESS = 'INTERVIEW_READINESS',
  /** The one-time Placement Readiness (calibration) test. */
  PLACEMENT_READINESS = 'PLACEMENT_READINESS',
  /** Answers to the drive's own questions, where they are scored rather than filtered. */
  CUSTOM_QUESTIONS = 'CUSTOM_QUESTIONS',
}

export const DIMENSION_LABELS: Readonly<Record<MatchDimension, string>> = {
  [MatchDimension.APTITUDE]: 'Aptitude',
  [MatchDimension.TECHNICAL]: 'Technical',
  [MatchDimension.COMMUNICATION]: 'Communication',
  [MatchDimension.RESUME]: 'Resume fit',
  [MatchDimension.INTERVIEW_READINESS]: 'Interview readiness',
  [MatchDimension.PLACEMENT_READINESS]: 'Placement readiness',
  [MatchDimension.CUSTOM_QUESTIONS]: 'Role questions',
};

/** Weights per dimension, 0–100. */
export type MatchWeights = Partial<Record<MatchDimension, number>>;

/**
 * The PRD's own example, used as the default so a drive created without touching the
 * weights still scores something defensible. Stated as an example there, and it stays an
 * example here: every drive can change it.
 *
 * Academics is absent on purpose. The PRD's example spends 20% on it, but this platform
 * holds no academic marks at all, so a default that weighted them would silently drop 20%
 * of every score through the missing-data rule and quietly rescale everything else. When
 * marks exist, academics becomes a hard-eligibility input first (§4) and a weighted
 * dimension second.
 */
export const DEFAULT_WEIGHTS: MatchWeights = {
  [MatchDimension.APTITUDE]: 25,
  [MatchDimension.TECHNICAL]: 30,
  [MatchDimension.COMMUNICATION]: 15,
  [MatchDimension.RESUME]: 15,
  [MatchDimension.INTERVIEW_READINESS]: 10,
  [MatchDimension.PLACEMENT_READINESS]: 5,
};

/** Why a component has no score. The distinction drives what the UI says. */
export enum MissingReason {
  /** Never measured — no attempt, no resume, no interview. */
  NOT_ASSESSED = 'NOT_ASSESSED',
  /** Measured, but longer ago than the drive accepts. */
  STALE = 'STALE',
  /** The drive gave this dimension no weight, so it was not computed. */
  NOT_WEIGHTED = 'NOT_WEIGHTED',
}

export interface ComponentScore {
  dimension: MatchDimension;
  /** 0–100, or null when there is nothing to report. */
  score: number | null;
  /** Where the number came from — "12 mock attempts", "AI mock interview". */
  source: string;
  /** When it was measured. ISO, or null when unmeasured. */
  measuredAt: string | null;
  /** The weight the drive gave this dimension. */
  weight: number;
  /** Weight × score ÷ 100, after renormalisation. Null when the component is missing. */
  contribution: number | null;
  /** Set only when `score` is null. */
  missing: MissingReason | null;
  /** How much evidence sits behind it — attempts, questions, submissions. */
  sampleSize?: number;
}

export interface MatchResult {
  /** 0–100 over the dimensions that could actually be measured, or null when none could. */
  score: number | null;
  components: ComponentScore[];
  /**
   * The share of the drive's intended weight that was measurable, 0–100. A 90% at 20%
   * coverage and a 90% at 100% coverage are different claims and must not render alike.
   */
  coverage: number;
  /** Dimensions with no score, for the "missing data" column the PRD asks for. */
  missing: MatchDimension[];
  /** Advisory only — never an action. */
  recommendation: MatchRecommendation;
}

/**
 * Wording for a human, not a decision. The PRD allows thresholds to "recommend", and
 * forbids them from rejecting on their own: "Recommendations must not automatically
 * reject a candidate unless the authorised operator has explicitly enabled a transparent
 * rule."
 */
export enum MatchRecommendation {
  READY = 'READY',
  PRACTICE_RECOMMENDED = 'PRACTICE_RECOMMENDED',
  /** Too little measured to say anything — the honest answer for most of this platform. */
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

/** Below this much coverage, no score is reported — there is not enough to average. */
export const MIN_COVERAGE_TO_SCORE = 40;
/** At or above this, a candidate is called ready. */
export const READY_AT = 70;

/** Problems with a weight set — empty when sound. */
export function validateWeights(weights: MatchWeights): string[] {
  const problems: string[] = [];
  const entries = Object.entries(weights) as Array<[MatchDimension, number]>;
  for (const [dim, w] of entries) {
    const name = DIMENSION_LABELS[dim] ?? dim;
    if (!Number.isFinite(w) || w < 0) problems.push(`${name}: weight must be zero or more`);
    else if (w > 100) problems.push(`${name}: weight cannot exceed 100`);
  }
  const total = entries.reduce((sum, [, w]) => sum + (Number.isFinite(w) ? w : 0), 0);
  // "weights must be configurable per role and total 100%."
  if (entries.length > 0 && Math.round(total) !== 100) {
    problems.push(`Weights add up to ${Math.round(total)}% — they must total 100%`);
  }
  return problems;
}

/** A measured value for one dimension, as the service collects it. */
export interface RawComponent {
  dimension: MatchDimension;
  /** 0–100, or null when unmeasured. */
  score: number | null;
  source: string;
  measuredAt: string | null;
  sampleSize?: number;
}

/**
 * Combine measured components into a score (PRD §6).
 *
 * The renormalisation is the whole algorithm, so it is worth being explicit: a missing
 * component is removed from BOTH the numerator and the denominator. With aptitude 25,
 * technical 30 and communication 15, a student measured only on aptitude and technical is
 * scored out of 55, not out of 70 — their unmeasured communication neither helps nor
 * harms them, which is the only defensible treatment of a measurement nobody took.
 */
export function computeMatch(
  raw: readonly RawComponent[],
  weights: MatchWeights = DEFAULT_WEIGHTS,
): MatchResult {
  const intendedTotal = Object.values(weights).reduce<number>(
    (sum, w) => sum + (Number.isFinite(w) ? (w as number) : 0),
    0,
  );

  const components: ComponentScore[] = [];
  let measuredWeight = 0;
  let weightedScore = 0;

  for (const [dim, weight] of Object.entries(weights) as Array<[MatchDimension, number]>) {
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const hit = raw.find((r) => r.dimension === dim);
    const score = hit?.score ?? null;

    if (score === null) {
      components.push({
        dimension: dim,
        score: null,
        source: hit?.source ?? 'Not assessed',
        measuredAt: hit?.measuredAt ?? null,
        weight,
        contribution: null,
        missing: MissingReason.NOT_ASSESSED,
        ...(hit?.sampleSize !== undefined ? { sampleSize: hit.sampleSize } : {}),
      });
      continue;
    }

    const clamped = Math.max(0, Math.min(100, score));
    measuredWeight += weight;
    weightedScore += (clamped * weight) / 100;
    components.push({
      dimension: dim,
      score: Math.round(clamped * 10) / 10,
      source: hit!.source,
      measuredAt: hit!.measuredAt,
      weight,
      // Filled below, once the renormalising denominator is known.
      contribution: null,
      missing: null,
      ...(hit!.sampleSize !== undefined ? { sampleSize: hit!.sampleSize } : {}),
    });
  }

  const coverage = intendedTotal > 0 ? Math.round((measuredWeight / intendedTotal) * 100) : 0;

  // Renormalise: out of what was measured, not out of what was hoped for.
  const score =
    measuredWeight > 0 && coverage >= MIN_COVERAGE_TO_SCORE
      ? Math.round((weightedScore / measuredWeight) * 100 * 10) / 10
      : null;

  for (const c of components) {
    if (c.score === null || measuredWeight === 0) continue;
    c.contribution = Math.round(((c.score * c.weight) / measuredWeight) * 10) / 10;
  }

  const missing = components.filter((c) => c.score === null).map((c) => c.dimension);

  return {
    score,
    components,
    coverage,
    missing,
    recommendation:
      score === null
        ? MatchRecommendation.INSUFFICIENT_DATA
        : score >= READY_AT
          ? MatchRecommendation.READY
          : MatchRecommendation.PRACTICE_RECOMMENDED,
  };
}

/** An authorised staff override of a computed score (PRD §6). */
export interface MatchOverride {
  score: number;
  reason: string;
  byUserId: string;
  atIso: string;
}

/**
 * Apply an override, keeping the computed result beside it.
 *
 * The original is never discarded: the PRD wants the measured performance AND the human
 * decision retained separately, so a reviewer can see what the engine said and what a
 * person decided instead.
 */
export function withOverride(
  result: MatchResult,
  override: MatchOverride | null,
): MatchResult & { overridden: MatchOverride | null; computedScore: number | null } {
  if (!override) return { ...result, overridden: null, computedScore: result.score };
  return {
    ...result,
    score: Math.max(0, Math.min(100, override.score)),
    computedScore: result.score,
    overridden: override,
    recommendation:
      override.score >= READY_AT
        ? MatchRecommendation.READY
        : MatchRecommendation.PRACTICE_RECOMMENDED,
  };
}
