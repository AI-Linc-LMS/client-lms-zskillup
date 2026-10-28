/**
 * The 3-day refund window.
 *
 * Shared byte-identical across both repos (ADR-011) because the SAME rule has to run in
 * two places: the API enforces it on the request, and the student's purchases page
 * decides whether to show the button at all. If those two disagree, a student sees
 * "Request refund", taps it, and gets an error — which is worse than no button, since
 * the entire point of this feature is to make paying feel low-risk.
 *
 * Money is only ever moved by the backend. Nothing here grants a refund; it answers
 * "may this be ASKED for", and the server asks again before it calls Razorpay.
 */

/** The window, in days. One constant — the requirement's "3 days" lives here only. */
export const REFUND_WINDOW_DAYS = 3;
export const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Lifecycle of one refund request. */
export const REFUND_REQUEST_STATUS = {
  /** Student asked; waiting on an admin. */
  REQUESTED: 'REQUESTED',
  /** Admin approved and Razorpay accepted the refund — money is on its way. */
  APPROVED: 'APPROVED',
  /** Razorpay confirmed the refund landed (set from the webhook). */
  PROCESSED: 'PROCESSED',
  /** Admin declined. */
  REJECTED: 'REJECTED',
  /** Approved, but Razorpay refused the refund call. Admin can retry. */
  FAILED: 'FAILED',
} as const;

export type RefundRequestStatus =
  (typeof REFUND_REQUEST_STATUS)[keyof typeof REFUND_REQUEST_STATUS];

export const REFUND_REQUEST_STATUSES: RefundRequestStatus[] = Object.values(REFUND_REQUEST_STATUS);

/** Why a purchase cannot be refunded. Rendered to the student, so each is a real sentence. */
export type RefundIneligibleReason =
  | 'NOT_PAID'
  | 'ALREADY_REFUNDED'
  | 'WINDOW_EXPIRED'
  | 'NOT_RECORDED'
  | 'ZERO_AMOUNT'
  | 'ALREADY_REQUESTED'
  | 'NOT_SELF_SERVE';

export const REFUND_INELIGIBLE_MESSAGE: Readonly<Record<RefundIneligibleReason, string>> = {
  NOT_PAID: 'This order was never paid, so there is nothing to refund.',
  ALREADY_REFUNDED: 'This purchase has already been refunded.',
  WINDOW_EXPIRED: `Refunds can be requested within ${REFUND_WINDOW_DAYS} days of payment. That window has closed for this purchase.`,
  NOT_RECORDED: 'We have no payment recorded against this order yet. If you were charged, contact support.',
  ZERO_AMOUNT: 'This purchase was free, so there is nothing to refund.',
  ALREADY_REQUESTED: 'A refund has already been requested for this purchase.',
  NOT_SELF_SERVE: 'This purchase was made by your college. Please ask your placement office.',
};

export interface RefundEligibilityInput {
  /** `PaymentOrderStatus` — only a PAID order can be refunded. */
  orderStatus: string;
  amountCents: number;
  /** When the payment was CAPTURED. The window runs from this, per the requirement. */
  paidAt: string | Date | null | undefined;
  /** Status of any existing request on this order; null when none. */
  existingRequestStatus?: string | null;
  /** 'USER' self-serve vs 'COLLEGE' B2B. */
  subjectType?: string | null;
  /** Injectable for tests; defaults to now. */
  now?: number;
}

export interface RefundEligibility {
  eligible: boolean;
  reason: RefundIneligibleReason | null;
  /** ISO instant the window shuts, or null when there is no payment to date from. */
  deadline: string | null;
  /** Milliseconds left; 0 once shut. */
  msRemaining: number;
}

function paidAtMs(paidAt: RefundEligibilityInput['paidAt']): number | null {
  if (!paidAt) return null;
  const t = paidAt instanceof Date ? paidAt.getTime() : new Date(paidAt).getTime();
  return Number.isFinite(t) ? t : null;
}

/** The instant the window shuts for a payment captured at `paidAt`. */
export function refundDeadline(paidAt: RefundEligibilityInput['paidAt']): Date | null {
  const t = paidAtMs(paidAt);
  return t === null ? null : new Date(t + REFUND_WINDOW_MS);
}

/**
 * May a refund be REQUESTED for this order right now?
 *
 * Order of checks matters: the most specific, most explanatory reason wins, so a student
 * whose purchase was already refunded is told that rather than "the window closed".
 */
export function refundEligibility(input: RefundEligibilityInput): RefundEligibility {
  const now = input.now ?? Date.now();
  const t = paidAtMs(input.paidAt);
  const deadlineMs = t === null ? null : t + REFUND_WINDOW_MS;
  const base = {
    deadline: deadlineMs === null ? null : new Date(deadlineMs).toISOString(),
    msRemaining: deadlineMs === null ? 0 : Math.max(0, deadlineMs - now),
  };
  const no = (reason: RefundIneligibleReason): RefundEligibility => ({
    eligible: false,
    reason,
    ...base,
  });

  // Terminal states first — they explain themselves better than the window does.
  if (input.orderStatus === 'REFUNDED') return no('ALREADY_REFUNDED');
  if (input.orderStatus !== 'PAID') return no('NOT_PAID');
  if ((input.subjectType ?? 'USER') !== 'USER') return no('NOT_SELF_SERVE');
  // A free order (100% coupon) has no captured payment to reverse.
  if (!input.amountCents || input.amountCents <= 0) return no('ZERO_AMOUNT');
  if (input.existingRequestStatus) return no('ALREADY_REQUESTED');
  // No capture timestamp means no clock to measure against — refuse rather than guess,
  // because guessing either denies a valid refund or opens an unbounded window.
  if (t === null) return no('NOT_RECORDED');
  if (base.msRemaining <= 0) return no('WINDOW_EXPIRED');

  return { eligible: true, reason: null, ...base };
}

/**
 * "2 days left" / "5 hours left" / "48 minutes left" — the urgency cue on the button.
 * Returns null once shut, so a caller renders the closed state instead of "0 minutes".
 */
export function formatRefundWindowLeft(msRemaining: number): string | null {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) return null;
  // Pluralise off the number actually SHOWN, not the raw one: under a minute we floor
  // to 0 but display 1, and pluralising on the raw value printed "1 minutes left".
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'} left`;
  const mins = Math.floor(msRemaining / 60_000);
  if (mins < 60) return unit(Math.max(1, mins), 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return unit(hours, 'hour');
  return unit(Math.floor(hours / 24), 'day');
}
