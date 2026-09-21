/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Razorpay AUTOPAY — a student's recurring mandate. JWT-gated, and 404 while the
 * AUTOPAY_ENABLED switch is off. The frontend imports these with `import type` so
 * the class-validator runtime never fires client-side.
 *
 * What a mandate costs is never sent by the client: like a one-time order, the
 * amount is resolved server-side from the price book and snapshotted on the mandate.
 */
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AutopayChargeStatus, AutopayStatus, BillingPeriod, EntitlementScope } from '../enums';

/** Turn on autopay for an item the student already holds, renewing every `period`. */
export class StartAutopayDto {
  @IsEnum(EntitlementScope)
  scope!: EntitlementScope;

  /** Required for SECTION/TOPIC/COMPANY (the slug); omit for PLATFORM. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  scopeRef?: string;

  @IsEnum(BillingPeriod)
  period!: BillingPeriod;
}

/** What the browser needs to open Razorpay Checkout on a mandate. */
export interface StartAutopayResultDto {
  /** Our id, for the verify call and for "manage autopay". */
  id: string;
  /** Opens Checkout with `subscription_id` instead of `order_id`. */
  razorpaySubscriptionId: string;
  /** The public checkout key. */
  razorpayKeyId: string;
  /** What each cycle charges, in paise — server-resolved, shown on the consent screen. */
  amountCents: number;
  currency: string;
  period: BillingPeriod;
  /** How many days of access each successful charge buys. */
  durationDays: number;
  /** When the FIRST plan-price charge happens — one day before current access runs
   *  out. Authorising the mandate only takes Razorpay's small, refundable verification
   *  amount (shown on its own screen), never the plan price. */
  firstChargeAt: string | null;
  /** True when an unauthorised mandate for the same item was handed back instead of a
   *  new one — retrying a closed checkout must not mint duplicate mandates. */
  reused: boolean;
}

/**
 * The Razorpay Checkout handler's response for a subscription. Note the fields
 * differ from a one-time order: there is no order id, and the signature is over
 * `payment_id|subscription_id` — the REVERSE of the order signature.
 */
export class VerifyAutopayDto {
  @IsString()
  @MaxLength(64)
  razorpayPaymentId!: string;

  @IsString()
  @MaxLength(64)
  razorpaySubscriptionId!: string;

  @IsString()
  @MaxLength(256)
  razorpaySignature!: string;
}

/** One of the student's mandates, as they see it on "manage autopay". */
export interface AutopayDto {
  id: string;
  status: AutopayStatus;
  scope: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  amountCents: number;
  currency: string;
  durationDays: number;
  /** Successful charges so far, per Razorpay. */
  paidCount: number;
  /** When Razorpay will next try to charge. Null once the mandate has ended. */
  nextChargeAt: string | null;
  /** The end of the period already paid for. */
  currentEnd: string | null;
  /** Cancellation was requested; access runs to `currentEnd`, no further charges. */
  cancelAtCycleEnd: boolean;
  cancelledAt: string | null;
  createdAt: string;
}

export interface AutopayListDto {
  /** Whether new mandates can be started right now (the AUTOPAY_ENABLED switch). */
  enabled: boolean;
  items: AutopayDto[];
}

// ─── Admin / Super Admin tracking ──────────────────────────────────────────────

/** One mandate as the admin ledger shows it: who, what, where it stands, and what
 *  it has actually collected. */
export interface AdminAutopayRowDto extends AutopayDto {
  student: { id: string; name: string | null; email: string };
  /** Charges that took the money. */
  capturedCount: number;
  /** Attempts that failed. Razorpay retries these; a mandate with several is at risk. */
  failedCount: number;
  refundedCount: number;
  /** Paise actually collected (captured, not refunded). */
  collectedCents: number;
  lastChargeAt: string | null;
}

export interface AdminAutopaySummaryDto {
  /** Mandates per status — the lifecycle at a glance. */
  byStatus: Record<AutopayStatus, number>;
  /** Paise collected by autopay, net of refunds, all time. */
  collectedCents: number;
  /** Failed charge attempts in the last 30 days. */
  failedLast30d: number;
  /** Renewals (captured charges) in the last 30 days. */
  renewalsLast30d: number;
}

export interface AdminAutopayListDto {
  summary: AdminAutopaySummaryDto;
  items: AdminAutopayRowDto[];
  /** True when the list hit its row cap and more mandates exist. */
  truncated: boolean;
}

/** One charge attempt on a mandate. */
export interface AutopayChargeDto {
  id: string;
  razorpayPaymentId: string;
  razorpayInvoiceId: string | null;
  amountCents: number;
  currency: string;
  status: AutopayChargeStatus;
  method: string | null;
  failureReason: string | null;
  chargedAt: string;
}
