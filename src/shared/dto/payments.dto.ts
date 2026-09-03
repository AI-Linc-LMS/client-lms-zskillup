/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Razorpay payments + entitlements (billing program). Student purchase endpoints
 * are JWT-gated; admin price-book / grant endpoints are gated server-side by
 * @RequireCapability('canManageSubscriptions'). The frontend imports these with
 * `import type` so the class-validator runtime never fires client-side.
 */
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BillingPeriod,
  EntitlementScope,
  EntitlementSubject,
  PriceTier,
} from '../enums';

// ─── Student purchase ────────────────────────────────────────────────────────

/** Start a purchase: create a Razorpay order for one scope + period. The amount
 *  is computed server-side from the price book — never sent by the client. */
export class CreateOrderDto {
  @IsEnum(EntitlementScope)
  scope!: EntitlementScope;

  /** Required for SECTION/TOPIC/COMPANY (the section/topic/company slug); omit for PLATFORM. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  scopeRef?: string;

  @IsEnum(BillingPeriod)
  period!: BillingPeriod;

  /** Optional coupon code. Validated + applied entirely server-side (the discount is
   *  never sent by the client); an invalid/ineligible code fails with a clear reason. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

/** Confirm a checkout from the Razorpay handler callback. The server re-verifies
 *  the HMAC signature before minting anything (the webhook is the other, primary
 *  path — both converge idempotently on the same order). */
export class VerifyPaymentDto {
  @IsString()
  @MaxLength(64)
  razorpayOrderId!: string;

  @IsString()
  @MaxLength(64)
  razorpayPaymentId!: string;

  @IsString()
  @MaxLength(256)
  razorpaySignature!: string;
}

/** One line of a cart (same shape as a single order: scope + period). */
export class CartItemDto {
  @IsEnum(EntitlementScope)
  scope!: EntitlementScope;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  scopeRef?: string;

  @IsEnum(BillingPeriod)
  period!: BillingPeriod;
}

/** Check out a whole cart as ONE Razorpay order. Each line is validated + priced
 *  server-side; already-owned lines are dropped before an order is created. */
export class CartCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  /** Optional coupon code applied to the whole cart. The discount is computed
   *  server-side over the eligible lines only; the client never sends an amount. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;
}

// ─── Admin: entitlement grant + price-book edit ──────────────────────────────

/** Admin-grant an entitlement out-of-band (comp, support, migration). */
export class GrantEntitlementDto {
  @IsEnum(EntitlementSubject)
  subjectType!: EntitlementSubject;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  collegeId?: string;

  @IsEnum(EntitlementScope)
  scope!: EntitlementScope;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  scopeRef?: string;

  /** Validity in days. Omit / null = perpetual. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number | null;
}

/** Edit a price-book row (configurable pricing). */
export class UpdatePriceBookDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  amountCents?: number;

  /** Strike-through/MRP price (minor units). null clears it (no strikethrough). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  mrpCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export interface PriceBookEntryDto {
  id: string;
  scopeType: EntitlementScope;
  tier: PriceTier;
  period: BillingPeriod;
  amountCents: number;
  /** Original/MRP price for a strike-through (same minor units). NULL = no MRP.
   *  Display-only — amountCents is the charged price; MRP never hits Razorpay. */
  mrpCents: number | null;
  currency: string;
  durationDays: number;
  isActive: boolean;
}

/** Returned by create-order — everything the Razorpay Checkout widget needs.
 *  `amountCents` is the CHARGED amount (already net of any coupon discount). */
export interface CreateOrderResultDto {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountCents: number;
  currency: string;
  scopeType: EntitlementScope;
  scopeRef: string | null;
  tier: PriceTier;
  period: BillingPeriod;
  /** Coupon discount applied (minor units); 0 when no coupon. */
  discountCents: number;
  /** The coupon code that produced the discount, or null. */
  couponCode: string | null;
  /** A coupon reduced the charge to ₹0 — access was granted server-side and there
   *  is NO Razorpay order to open. The client shows success without the widget. */
  free: boolean;
}

export interface EntitlementDto {
  id: string;
  subjectType: EntitlementSubject;
  userId: string | null;
  collegeId: string | null;
  scopeType: EntitlementScope;
  scopeRef: string | null;
  source: string;
  /** Effective status — EXPIRED is computed when expiresAt has passed. */
  status: string;
  startsAt: string;
  expiresAt: string | null;
  /** Whole days until expiry (0 if expired/expiring today; null if perpetual). */
  daysRemaining: number | null;
}

/** An entitlement enriched with the granted user's identity — for the admin
 *  "who has complimentary access" list. */
export interface GrantedEntitlementDto extends EntitlementDto {
  userName: string | null;
  userEmail: string | null;
}

/** One priced line of a cart order (read shape). */
export interface CartLineDto {
  scopeType: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  amountCents: number;
  durationDays: number;
}

/** Returned by cart-checkout — one order for the whole cart + its priced lines.
 *  `amountCents` is the CHARGED total (already net of any coupon discount). */
export interface CartOrderResultDto {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountCents: number;
  currency: string;
  lines: CartLineDto[];
  /** Lines dropped because the buyer already owns them (nothing charged for these). */
  skipped: CartLineDto[];
  /** Coupon discount applied to the eligible lines (minor units); 0 when no coupon. */
  discountCents: number;
  /** The coupon code that produced the discount, or null. */
  couponCode: string | null;
  /** A coupon reduced the charge to ₹0 — access was granted server-side and there
   *  is NO Razorpay order to open. The client shows success without the widget. */
  free: boolean;
}

/** One line of the student's purchase history. scopeType/period are null for a
 *  multi-item cart order — read `items` for its lines instead. */
export interface PurchaseHistoryItemDto {
  orderId: string;
  scopeType: EntitlementScope | null;
  scopeRef: string | null;
  period: BillingPeriod | null;
  tier: PriceTier;
  /** The charged amount (net of any coupon discount). */
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  items?: CartLineDto[];
  /** Coupon code used on this order, or null. */
  couponCode: string | null;
  /** Discount applied by the coupon (minor units); 0 when none. */
  discountCents: number;
}

/** The "My Subscription" surface for a student. */
export interface MySubscriptionDto {
  hasPlatform: boolean;
  entitlements: EntitlementDto[];
  history: PurchaseHistoryItemDto[];
  /** Server view of the paywall switch (false → everything is open / dormant). */
  paywallEnabled: boolean;
  /** Career tools (Mock Interview, Resume Builder) unlocked — bundled with a
   *  Company hub or the Full Platform plan (true while the paywall is off). */
  careerToolsEntitled: boolean;
  /** Per-module EFFECTIVE subscription-lock state (master paywall AND the module's
   *  admin toggle). `true` = locked for a non-entitled student; `false` = open. Lets the
   *  FE mirror a single module being freed. Optional — older servers omit it, and the FE
   *  falls back to `paywallEnabled`. Keys: mock, practice, coding, company, mock_interview,
   *  resume, study_material. */
  subscriptionLocks?: Record<string, boolean>;
}

/**
 * Server-truth for the Practice Hub's up-front locks (Phase 8). The frontend renders
 * visible padlocks from this instead of re-deriving business state client-side. Fails
 * OPEN: while the paywall is off (or single-scope off), `hasPlatform` is true and the
 * free maps are empty, so nothing is locked. `freeSubtopicSlugBySection` maps a root
 * section slug → the one sub-topic slug that is free (claimed) in it; `freeCompanySlug`
 * is the one free company. Only populated under the single-scope model.
 */
export interface PracticeAccessMapDto {
  paywallEnabled: boolean;
  /** The aggressive "one free scope, rest locked" model is active. */
  singleScopeEnabled: boolean;
  /** Caller holds full-platform access (own or college) → never lock anything. */
  hasPlatform: boolean;
  /** Caller holds ANY active COMPANY grant (own or college-inherited). Under the
   *  Option-2 model (owner decision 2026-08) this unlocks the GENERAL practice
   *  surfaces — Practice Hub by section/topic, the Sectional Hub, and Coding — like a
   *  platform plan (per-company hubs stay gated per company). Kept separate from
   *  hasPlatform so the company chips still lock companies the caller doesn't own. */
  hasCompanyAccess: boolean;
  /** Root-section slug → the single free sub-topic slug in that section (empty = none claimed / no locks). */
  freeSubtopicSlugBySection: Record<string, string>;
  /** The single free company slug (null = none claimed / no locks). */
  freeCompanySlug: string | null;
}

/**
 * One row of the Super-Admin transactions ledger (Billing → Transactions). Joins a
 * captured/failed/pending payment to its order, the buyer's identity, the purchased
 * product scope, and the resulting access validity — everything needed to verify a
 * transaction or support a customer from one place.
 */
export interface AdminTransactionDto {
  paymentId: string;
  /** Gateway payment/transaction id (razorpay_payment_id); null if never captured. */
  transactionId: string | null;
  orderId: string;
  /** Gateway order id (razorpay_order_id). */
  gatewayOrderId: string | null;
  userId: string | null;
  userName: string | null;
  email: string | null;
  phone: string | null;
  /** Purchased product: scope (PLATFORM/COMPANY/SECTION/TOPIC/null) + optional ref.
   *  Order-level; often null for multi-item carts — see `products` for the truth. */
  scopeType: string | null;
  scopeRef: string | null;
  /** The exact line items purchased (an order is a cart). Each is what was bought:
   *  e.g. {PLATFORM}, {COMPANY, infosys}, {TOPIC, …blood-relations}. Falls back to
   *  the order-level scope when there are no line items. */
  products: Array<{ scopeType: string; scopeRef: string | null }>;
  tier: string | null;
  period: string | null;
  amountCents: number;
  currency: string;
  /** Payment status (CAPTURED / FAILED / PENDING / …). */
  status: string;
  method: string | null;
  /** ISO timestamp the payment was captured/created. */
  capturedAt: string | null;
  /** Access validity granted by this order (entitlement expiry ISO; null = perpetual/none). */
  validUntil: string | null;
  /** Coupon code applied to this order, or null. */
  couponCode: string | null;
  /** Discount applied by the coupon (minor units); 0 when none. */
  discountCents: number;
}

export interface AdminTransactionsPageDto {
  items: AdminTransactionDto[];
  total: number;
  limit: number;
  offset: number;
}
