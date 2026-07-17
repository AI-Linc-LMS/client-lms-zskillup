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

/** Returned by create-order — everything the Razorpay Checkout widget needs. */
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

/** One priced line of a cart order (read shape). */
export interface CartLineDto {
  scopeType: EntitlementScope;
  scopeRef: string | null;
  period: BillingPeriod;
  amountCents: number;
  durationDays: number;
}

/** Returned by cart-checkout — one order for the whole cart + its priced lines. */
export interface CartOrderResultDto {
  orderId: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountCents: number;
  currency: string;
  lines: CartLineDto[];
  /** Lines dropped because the buyer already owns them (nothing charged for these). */
  skipped: CartLineDto[];
}

/** One line of the student's purchase history. scopeType/period are null for a
 *  multi-item cart order — read `items` for its lines instead. */
export interface PurchaseHistoryItemDto {
  orderId: string;
  scopeType: EntitlementScope | null;
  scopeRef: string | null;
  period: BillingPeriod | null;
  tier: PriceTier;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  items?: CartLineDto[];
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
}
