/**
 * SHARED CONTRACT — DUPLICATED BYTE-FOR-BYTE ACROSS BOTH REPOS (ADR-011).
 *
 * PLACEMENT ANALYTICS (PRD §14).
 *
 * Six reporting levels, and two sentences in §14 that decide the whole shape of this file:
 *
 *   "Use consistent metric definitions (e.g., 'placed' must distinguish offer received,
 *    accepted and joined). SHOW DENOMINATOR AND TIME PERIOD FOR EACH RATE."
 *
 *   "HISTORICAL ANALYTICS MUST REMAIN ACCURATE when candidate records or current placement
 *    status are updated."
 *
 * Both are requirements about honesty rather than features, and both are enforced here by
 * construction rather than left to whoever writes the next query:
 *
 *   1. A RATE CANNOT BE A BARE NUMBER. `Rate` carries its numerator, its denominator and
 *      the window it was measured over. "68% conversion" is unreadable — 68% of seventeen
 *      people last week is a different claim from 68% of nine hundred over a year, and the
 *      number alone cannot tell you which. Making the denominator part of the type means an
 *      endpoint physically cannot return a percentage without saying what it is a percentage
 *      OF. That is the cheapest possible guard against the most common reporting lie.
 *
 *   2. AN EMPTY DENOMINATOR IS NOT ZERO PERCENT. Nobody applied yet is not the same fact as
 *      everybody failed, and 0/0 renders as "0%" in every naive implementation. `pct` is
 *      null when there is nothing to divide, exactly as §6 refuses to render an unmeasured
 *      dimension as a score of zero.
 *
 *   3. A FUNNEL IS BUILT FROM EVENTS, NEVER FROM CURRENT STATUS. This is the entire reason
 *      §10 writes an event per move instead of updating a column. A candidate who reached
 *      the interview round and was then rejected has current status REJECTED — so a funnel
 *      counting current statuses would show the interview count DROP as decisions get made,
 *      and a report run twice would disagree with itself. `reachedStages` answers "where did
 *      this person EVER get to", which is monotone: it can only grow.
 */

/** The windows §14 asks reports to be filterable by. */
export interface Period {
  /** ISO date, inclusive. Null means "since records began". */
  from: string | null;
  /** ISO date, inclusive. Null means "up to now". */
  to: string | null;
}

/**
 * A measured rate, and everything needed to read it honestly.
 *
 * Deliberately NOT a number. §14 asks for the denominator and the period on every rate, and
 * a `number` return type is an invitation to drop both.
 */
export interface Rate {
  numerator: number;
  denominator: number;
  /** Null when the denominator is 0 — "nothing to measure", not "zero percent". */
  pct: number | null;
  period: Period;
  /** What the denominator actually counts, in words, for the report to print. */
  of: string;
}

export function rate(
  numerator: number,
  denominator: number,
  of: string,
  period: Period = { from: null, to: null },
): Rate {
  return {
    numerator,
    denominator,
    // Nobody applied is not everybody failed. Rendering 0/0 as 0% is how an empty
    // report comes to look like a catastrophic one.
    pct: denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null,
    period,
    of,
  };
}

/** Formats a rate the way §14 wants it read: never a naked percentage. */
export function formatRate(r: Rate): string {
  if (r.pct === null) return `no data (0 ${r.of})`;
  return `${r.pct}% (${r.numerator} of ${r.denominator} ${r.of})`;
}

/* ------------------------------------------------------------------------- */
/* The funnel                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * The stages a drive's candidates pass through, in order.
 *
 * These are REPORTING stages, coarser than §10's twenty-one pipeline stages: a funnel with
 * twenty-one steps is not a funnel anybody reads. Each maps to the pipeline stages that
 * count as having reached it.
 */
export enum FunnelStage {
  ELIGIBLE = 'ELIGIBLE',
  APPLIED = 'APPLIED',
  REVIEWED = 'REVIEWED',
  SHORTLISTED = 'SHORTLISTED',
  ASSESSED = 'ASSESSED',
  SHARED = 'SHARED',
  INTERVIEWED = 'INTERVIEWED',
  SELECTED = 'SELECTED',
  OFFERED = 'OFFERED',
  ACCEPTED = 'ACCEPTED',
  JOINED = 'JOINED',
}

export const FUNNEL_ORDER: readonly FunnelStage[] = [
  FunnelStage.ELIGIBLE,
  FunnelStage.APPLIED,
  FunnelStage.REVIEWED,
  FunnelStage.SHORTLISTED,
  FunnelStage.ASSESSED,
  FunnelStage.SHARED,
  FunnelStage.INTERVIEWED,
  FunnelStage.SELECTED,
  FunnelStage.OFFERED,
  FunnelStage.ACCEPTED,
  FunnelStage.JOINED,
] as const;

export const FUNNEL_STAGE_LABELS: Readonly<Record<FunnelStage, string>> = {
  [FunnelStage.ELIGIBLE]: 'Eligible',
  [FunnelStage.APPLIED]: 'Applied',
  [FunnelStage.REVIEWED]: 'Reviewed',
  [FunnelStage.SHORTLISTED]: 'Shortlisted',
  [FunnelStage.ASSESSED]: 'Assessed',
  [FunnelStage.SHARED]: 'Shared with employer',
  [FunnelStage.INTERVIEWED]: 'Interviewed',
  [FunnelStage.SELECTED]: 'Selected',
  [FunnelStage.OFFERED]: 'Offer issued',
  [FunnelStage.ACCEPTED]: 'Offer accepted',
  [FunnelStage.JOINED]: 'Joined',
};

/**
 * Which §10 pipeline stages mean a candidate reached each funnel stage.
 *
 * Note the deliberate asymmetry: reaching a LATER pipeline stage implies the earlier funnel
 * stages too, and that is handled by `reachedStages` rather than by listing every stage
 * under every bucket. An offer cannot have been issued to somebody who never applied, so an
 * OFFER_ISSUED event alone is enough to prove APPLIED — otherwise a drive whose staff moved
 * people straight to the outcome would report an offer rate above its application count.
 */
export const STAGE_TO_FUNNEL: Readonly<Record<string, FunnelStage>> = {
  APPLIED: FunnelStage.APPLIED,
  SUBMITTED: FunnelStage.APPLIED,
  UNDER_REVIEW: FunnelStage.REVIEWED,
  NEEDS_INFO: FunnelStage.REVIEWED,
  ON_HOLD: FunnelStage.REVIEWED,
  SHORTLISTED: FunnelStage.SHORTLISTED,
  ASSESSMENT_INVITED: FunnelStage.SHORTLISTED,
  ASSESSMENT_COMPLETED: FunnelStage.ASSESSED,
  SHARED_WITH_EMPLOYER: FunnelStage.SHARED,
  EMPLOYER_SHORTLISTED: FunnelStage.SHARED,
  IN_ROUND: FunnelStage.INTERVIEWED,
  INTERVIEW: FunnelStage.INTERVIEWED,
  NO_SHOW: FunnelStage.INTERVIEWED,
  SELECTED: FunnelStage.SELECTED,
  HIRED: FunnelStage.SELECTED,
  WAITLISTED: FunnelStage.SELECTED,
  OFFER_ISSUED: FunnelStage.OFFERED,
  OFFER_DECLINED: FunnelStage.OFFERED,
  OFFER_EXPIRED: FunnelStage.OFFERED,
  OFFER_ACCEPTED: FunnelStage.ACCEPTED,
  DID_NOT_JOIN: FunnelStage.ACCEPTED,
  JOINED: FunnelStage.JOINED,
  // REJECTED and WITHDRAWN say a run ENDED; they say nothing about how far it got, which
  // is read from the rest of the history. Mapping them to a funnel stage would be the bug
  // this whole module exists to avoid.
};

/** One candidate's history in one drive — the stages they were ever moved to. */
export interface CandidateHistory {
  candidateId: string;
  /** Every stage ever recorded, in any order. Current status is NOT consulted. */
  stagesEverReached: readonly string[];
  /** Did they end on a rejection, and at which funnel stage did that run stop. */
  rejected?: boolean;
  withdrawn?: boolean;
}

/**
 * The furthest funnel stage this candidate reached, and every stage implied beneath it.
 *
 * MONOTONE BY CONSTRUCTION. A later decision can only add to this set, never remove from
 * it, which is what makes a report run today agree with the same report run next month.
 * Computing this from `job_applications.status` instead would make the interview count fall
 * every time somebody is rejected after an interview — the report would quietly improve its
 * own conversion rates as more decisions were made.
 */
export function reachedStages(stagesEverReached: readonly string[]): Set<FunnelStage> {
  let furthest = -1;
  for (const s of stagesEverReached) {
    const f = STAGE_TO_FUNNEL[s];
    if (f === undefined) continue;
    const idx = FUNNEL_ORDER.indexOf(f);
    if (idx > furthest) furthest = idx;
  }
  const out = new Set<FunnelStage>();
  if (furthest < 0) return out;
  // Everything up to and including the furthest point: you cannot be offered a job you
  // never applied for, so the earlier stages are proven by the later one.
  for (let i = 0; i <= furthest; i++) out.add(FUNNEL_ORDER[i]);
  return out;
}

export function furthestStage(stagesEverReached: readonly string[]): FunnelStage | null {
  const reached = reachedStages(stagesEverReached);
  for (let i = FUNNEL_ORDER.length - 1; i >= 0; i--) {
    if (reached.has(FUNNEL_ORDER[i])) return FUNNEL_ORDER[i];
  }
  return null;
}

export interface FunnelStep {
  stage: FunnelStage;
  label: string;
  /** How many candidates ever reached this stage. */
  count: number;
  /** Conversion from the previous step. Null on the first step — nothing precedes it. */
  conversionFromPrevious: Rate | null;
  /** Conversion from the top of the funnel, so a reader can see cumulative loss. */
  conversionFromTop: Rate | null;
  /** How many got this far and no further. The drop-off §14 asks to rank. */
  stoppedHere: number;
}

export interface Funnel {
  steps: FunnelStep[];
  period: Period;
  /** The stage with the largest drop-off, for §14's "stage improvement" level. */
  worstDropOff: { stage: FunnelStage; label: string; lost: number; rate: Rate } | null;
}

/**
 * Build a funnel from candidate histories.
 *
 * `eligibleCount` is passed in rather than derived because eligibility is a property of the
 * audience, not of the applications — the students who could have applied and did not are
 * invisible in an application table, and they are exactly the population §14's
 * "completion/drop-off" measure is about.
 */
export function buildFunnel(
  histories: readonly CandidateHistory[],
  eligibleCount: number,
  period: Period = { from: null, to: null },
): Funnel {
  const counts = new Map<FunnelStage, number>();
  const furthestCounts = new Map<FunnelStage, number>();
  for (const stage of FUNNEL_ORDER) {
    counts.set(stage, 0);
    furthestCounts.set(stage, 0);
  }
  counts.set(FunnelStage.ELIGIBLE, eligibleCount);

  for (const h of histories) {
    for (const stage of reachedStages(h.stagesEverReached)) {
      if (stage === FunnelStage.ELIGIBLE) continue;
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    const f = furthestStage(h.stagesEverReached);
    if (f) furthestCounts.set(f, (furthestCounts.get(f) ?? 0) + 1);
  }

  // Anybody who applied was, by definition, eligible to — so the eligible count can never
  // be smaller than the applied count. A mismatch means the audience was recalculated after
  // the fact, and silently reporting conversion above 100% would hide that.
  const applied = counts.get(FunnelStage.APPLIED) ?? 0;
  const topCount = Math.max(eligibleCount, applied);
  counts.set(FunnelStage.ELIGIBLE, topCount);

  const steps: FunnelStep[] = FUNNEL_ORDER.map((stage, i) => {
    const count = counts.get(stage) ?? 0;
    const prev = i === 0 ? null : (counts.get(FUNNEL_ORDER[i - 1]) ?? 0);
    return {
      stage,
      label: FUNNEL_STAGE_LABELS[stage],
      count,
      conversionFromPrevious:
        prev === null
          ? null
          : rate(count, prev, `who reached ${FUNNEL_STAGE_LABELS[FUNNEL_ORDER[i - 1]].toLowerCase()}`, period),
      conversionFromTop:
        i === 0 ? null : rate(count, topCount, 'eligible candidates', period),
      stoppedHere: furthestCounts.get(stage) ?? 0,
    };
  });

  // The biggest single loss between consecutive stages — §14's "identify stages with
  // highest rejection/drop-off". Measured as people lost, then reported with its rate so
  // the reader can see whether a big number is a big proportion.
  let worst: Funnel['worstDropOff'] = null;
  for (let i = 1; i < steps.length; i++) {
    const lost = steps[i - 1].count - steps[i].count;
    if (lost <= 0) continue;
    if (!worst || lost > worst.lost) {
      worst = {
        stage: steps[i - 1].stage,
        label: `${steps[i - 1].label} → ${steps[i].label}`,
        lost,
        rate: rate(lost, steps[i - 1].count, `who reached ${steps[i - 1].label.toLowerCase()}`, period),
      };
    }
  }

  return { steps, period, worstDropOff: worst };
}

/* ------------------------------------------------------------------------- */
/* Filters                                                                    */
/* ------------------------------------------------------------------------- */

/** The filter set §14 requires on every report. */
export interface AnalyticsFilters {
  from?: string | null;
  to?: string | null;
  collegeId?: string | null;
  /**
   * The colleges the CALLER may read at all — not a filter the user chose.
   *
   * `null` means unscoped (SUPER_ADMIN, or an ADMIN with no portfolio). An array
   * confines every aggregate to those colleges, and an EMPTY array matches nothing,
   * which is the safe reading of "assigned to no colleges".
   *
   * The controller computed this and passed it for a long time while the service
   * ignored it, so a portfolio-scoped admin was being shown platform-wide numbers on
   * the two endpoints where scope is the only control. It is part of the filter set
   * now so it cannot be dropped silently again.
   */
  scopedToColleges?: string[] | null;
  cohort?: string | null;
  /**
   * Passout year, e.g. "2027" — what a placement office calls a batch.
   *
   * DELIBERATELY NOT THE SAME AS `cohort`. A cohort is a real tenancy.cohorts row; a
   * batch is everyone graduating that year, which usually spans several cohorts and
   * sometimes several colleges. Conflating them would silently merge two cohorts that
   * graduate together — the service comment warned about exactly this before the filter
   * existed to honour it.
   */
  batch?: string | null;
  department?: string | null;
  companyId?: string | null;
  driveId?: string | null;
  role?: string | null;
  driveStatus?: string | null;
  employmentType?: string | null;
  location?: string | null;
  placementStatus?: string | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
}

export function periodOf(f: AnalyticsFilters): Period {
  return { from: f.from ?? null, to: f.to ?? null };
}

/**
 * CTC distribution, in bands rather than a mean.
 *
 * A mean CTC is the second most misleading number in placement reporting after an
 * undenominated rate: one exceptional offer drags it above anything most students will see.
 * Bands plus a median describe the spread somebody is actually choosing between.
 */
export interface CtcDistribution {
  bands: Array<{ label: string; min: number; max: number | null; count: number }>;
  median: number | null;
  /** Highest and lowest, which a band chart hides. */
  highest: number | null;
  lowest: number | null;
  /** Deliberately present AND deliberately secondary to the median. */
  mean: number | null;
  counted: number;
}

const CTC_BANDS: Array<{ label: string; min: number; max: number | null }> = [
  { label: 'Under ₹3L', min: 0, max: 300000 },
  { label: '₹3L – ₹5L', min: 300000, max: 500000 },
  { label: '₹5L – ₹8L', min: 500000, max: 800000 },
  { label: '₹8L – ₹12L', min: 800000, max: 1200000 },
  { label: '₹12L – ₹20L', min: 1200000, max: 2000000 },
  { label: '₹20L and above', min: 2000000, max: null },
];

export function ctcDistribution(values: readonly number[]): CtcDistribution {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  const bands = CTC_BANDS.map((b) => ({
    ...b,
    count: nums.filter((v) => v >= b.min && (b.max === null || v < b.max)).length,
  }));
  if (nums.length === 0) {
    return { bands, median: null, highest: null, lowest: null, mean: null, counted: 0 };
  }
  const mid = Math.floor(nums.length / 2);
  return {
    bands,
    median: nums.length % 2 === 0 ? Math.round((nums[mid - 1] + nums[mid]) / 2) : nums[mid],
    highest: nums[nums.length - 1],
    lowest: nums[0],
    mean: Math.round(nums.reduce((t, v) => t + v, 0) / nums.length),
    counted: nums.length,
  };
}

/**
 * Time to fill / time to placement, in days.
 *
 * Reported as a median for the same reason as CTC: one drive that dragged on for eight
 * months should not become the headline for a programme where most close in three weeks.
 */
export function medianDays(spans: readonly number[]): number | null {
  const nums = spans.filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? Math.round((nums[mid - 1] + nums[mid]) / 2) : nums[mid];
}
