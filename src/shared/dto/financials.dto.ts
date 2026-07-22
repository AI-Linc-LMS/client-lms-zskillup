/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Lightweight financials (Phase 7). A read-only revenue view derived from the
 * plan catalog × college subscriptions - no billing integration. All money in
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

// ─── Real payment financials (Razorpay program, Super-Admin) ─────────────────

/** B2C revenue grouped by what was bought (PLATFORM/SECTION/TOPIC/COMPANY). */
export interface FinancialsRevenueByScope {
  scope: string;
  /** Count of PAID orders for this scope. */
  count: number;
  /** Total captured amount for this scope, minor units. */
  amountCents: number;
}

/** B2B revenue by college (from college subscriptions until college checkout ships). */
export interface FinancialsRevenueByCollege {
  collegeId: string;
  collegeName: string;
  amountCents: number;
  subscriptions: number;
}

/**
 * The real-money view (Super-Admin only), computed from actual Razorpay
 * orders/payments + student entitlements - not derived from plan prices.
 */
export interface FinancialsPaymentsDto {
  currency: string;
  /** Captured revenue in the current calendar month / year / all-time. */
  monthlyRevenueCents: number;
  annualRevenueCents: number;
  lifetimeRevenueCents: number;
  /** Payment outcome counts. */
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  /** Active (non-expired) student entitlements + distinct paying students. */
  activeEntitlements: number;
  activeSubscribers: number;
  /** Active entitlements expiring within 7 days. */
  expiringSoon: number;
  /** B2C revenue by product type; B2B revenue by college. */
  revenueByScope: FinancialsRevenueByScope[];
  revenueByCollege: FinancialsRevenueByCollege[];
  /** Date-filtered figures driven by the dashboard's date filter. Defaults to the
   *  current calendar month; ISO strings echo the resolved range back to the UI. */
  rangeFrom: string;
  rangeTo: string;
  rangeRevenueCents: number;
  rangeSuccessfulPayments: number;
  rangeFailedPayments: number;
  rangePendingPayments: number;
  rangeRevenueByScope: FinancialsRevenueByScope[];
}
