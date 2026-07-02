/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Lightweight financials (Phase 7). A read-only revenue view derived from the
 * plan catalog × college subscriptions — no billing integration. All money in
 * minor units (cents/paise). MRR normalises each dated plan to 30 days; perpetual
 * plans contribute to booked value but not to MRR.
 */

export interface FinancialsPlanBreakdown {
  planId: string | null;
  planName: string;
  activeCount: number;
  /** Recurring monthly value from this plan's active paying subs, in minor units. */
  monthlyCents: number;
}

export interface FinancialsOverviewDto {
  currency: string;
  /** Effective-active subscriptions (status ACTIVE and not past expiry), incl. trials. */
  activeSubscriptions: number;
  /** Active, non-trial, priced subscriptions. */
  payingSubscriptions: number;
  trials: number;
  expired: number;
  cancelled: number;
  /** Monthly recurring revenue (dated plans normalised to 30 days). */
  mrrCents: number;
  /** MRR × 12. */
  arrCents: number;
  /** Sum of active paying subscriptions' plan prices (booked value). */
  bookedValueCents: number;
  /** Paying subscriptions activated in the last 30 days. */
  newActivations30d: number;
  byPlan: FinancialsPlanBreakdown[];
}
