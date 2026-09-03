/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo
 * (backend-repo/src/shared & frontend-repo/src/shared). Change both together.
 *
 * Coupons & campaigns (billing program). Student endpoints preview a coupon against
 * a cart; admin endpoints CRUD coupons + campaigns and read the usage dashboard.
 * Admin routes are gated server-side by @Roles(ADMIN, SUPER_ADMIN) +
 * @RequireCapability('canManageSubscriptions'); an ADMIN may only edit coupons they
 * created, a SUPER_ADMIN may override any (enforced in the service). The frontend
 * imports these with `import type` so the class-validator runtime never fires
 * client-side. Amounts are minor units (paise) and validated/priced server-side —
 * the client never sends a discount.
 */
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
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
  CouponAudience,
  CouponCampaignChannel,
  CouponDiscountType,
  EntitlementScope,
} from '../enums';
import { CartItemDto } from './payments.dto';

// ─── Applicability ───────────────────────────────────────────────────────────

/** One SKU a coupon applies to. `scopeRef` null/omitted = the whole scope type
 *  (any ref of it); set = one specific slug. Only used when appliesToAll = false. */
export class CouponApplicabilityEntryDto {
  @IsEnum(EntitlementScope)
  scopeType!: EntitlementScope;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(160)
  scopeRef?: string | null;
}

// ─── Admin: coupon CRUD ──────────────────────────────────────────────────────

export class CreateCouponDto {
  /** 2–40 chars; normalised to UPPERCASE server-side and unique. */
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  campaignId?: string | null;

  @IsEnum(CouponDiscountType)
  discountType!: CouponDiscountType;

  /** PERCENT: 1–100. FLAT: amount off in minor units (paise). */
  @IsInt()
  @Min(1)
  @Max(10_000_00)
  discountValue!: number;

  /** Cap for a PERCENT coupon (minor units). null = uncapped. Ignored for FLAT. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  maxDiscountCents?: number | null;

  /** Minimum cart total (minor units) required for the coupon to apply. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  minOrderCents?: number;

  /** true = applies to any purchasable line; false = only the `applicability` SKUs. */
  @IsOptional()
  @IsBoolean()
  appliesToAll?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CouponApplicabilityEntryDto)
  applicability?: CouponApplicabilityEntryDto[];

  @IsOptional()
  @IsEnum(CouponAudience)
  audience?: CouponAudience;

  /** Required (non-empty) when audience = USER; ignored otherwise. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  targetUserIds?: string[];

  /** Total redemption cap across all users. null = unlimited. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  maxRedemptions?: number | null;

  /** Per-user redemption cap. Default 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  perUserLimit?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  expiresAt?: string | null;

  /** Reserved for Autopay (Phase 5): whether the discount carries into recurring
   *  charges. Default false — a coupon only ever discounts the first payment. */
  @IsOptional()
  @IsBoolean()
  appliesToRecurring?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Partial update. `code` is immutable once created (orders snapshot it). */
export class UpdateCouponDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  campaignId?: string | null;

  @IsOptional()
  @IsEnum(CouponDiscountType)
  discountType?: CouponDiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_00)
  discountValue?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  maxDiscountCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_00)
  minOrderCents?: number;

  @IsOptional()
  @IsBoolean()
  appliesToAll?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CouponApplicabilityEntryDto)
  applicability?: CouponApplicabilityEntryDto[];

  @IsOptional()
  @IsEnum(CouponAudience)
  audience?: CouponAudience;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  targetUserIds?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  perUserLimit?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @IsBoolean()
  appliesToRecurring?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Admin: campaign CRUD ────────────────────────────────────────────────────

export class CreateCampaignDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsEnum(CouponCampaignChannel)
  channel?: CouponCampaignChannel;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsEnum(CouponCampaignChannel)
  channel?: CouponCampaignChannel;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Student: preview a coupon against a cart ────────────────────────────────

/** Preview what a code would do to a cart, before opening the payment widget. The
 *  discount is computed server-side over the same line resolution the real order
 *  uses, so the previewed number is exactly what will be charged. */
export class CouponPreviewRequestDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

/** One SKU a coupon is scoped to (read form). */
export interface CouponApplicabilityDto {
  scopeType: EntitlementScope;
  scopeRef: string | null;
}

/** Full admin view of a coupon + its usage rollup (derived from orders). */
export interface CouponDto {
  id: string;
  code: string;
  description: string | null;
  campaignId: string | null;
  campaignName: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountCents: number | null;
  minOrderCents: number;
  currency: string;
  appliesToAll: boolean;
  applicability: CouponApplicabilityDto[];
  audience: CouponAudience;
  targetUserIds: string[];
  maxRedemptions: number | null;
  perUserLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  appliesToRecurring: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  /** Confirmed (PAID) redemptions. */
  redemptions: number;
  /** Live holds (CREATED orders, not yet paid) counting toward the caps. */
  reserved: number;
  /** maxRedemptions − (redemptions + reserved); null when unlimited. */
  remaining: number | null;
  /** Total discount given on PAID orders (minor units). */
  discountGivenCents: number;
  /** Charged revenue on PAID orders that used this coupon (minor units). */
  revenueCents: number;
}

/** Result of a student coupon preview. */
export interface CouponPreviewResultDto {
  valid: boolean;
  code: string;
  /** Discount that would be applied (minor units); 0 when invalid. */
  discountCents: number;
  /** Eligible subtotal the discount was computed on (minor units). */
  eligibleCents: number;
  /** Cart total the minimum-order check ran against (minor units). */
  cartTotalCents: number;
  /** Short label, e.g. "20% OFF" / "₹100 OFF"; null when invalid. */
  label: string | null;
  /** Why the coupon can't be used (student-facing); null when valid. */
  reason: string | null;
}

/** Admin view of a campaign + its rolled-up performance. */
export interface CouponCampaignDto {
  id: string;
  name: string;
  description: string | null;
  channel: CouponCampaignChannel;
  isActive: boolean;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  couponCount: number;
  redemptions: number;
  discountGivenCents: number;
  revenueCents: number;
}

/** The coupon usage & campaign-performance dashboard. */
export interface CouponUsageStatsDto {
  currency: string;
  totalCoupons: number;
  activeCoupons: number;
  /** PAID orders that used any coupon. */
  totalRedemptions: number;
  /** Total discount given on those orders (minor units). */
  totalDiscountCents: number;
  /** Charged revenue on those orders (minor units). */
  totalRevenueCents: number;
  topCoupons: Array<{
    couponId: string;
    code: string;
    redemptions: number;
    discountCents: number;
    revenueCents: number;
  }>;
  campaigns: Array<{
    campaignId: string;
    name: string;
    channel: CouponCampaignChannel;
    couponCount: number;
    redemptions: number;
    discountCents: number;
    revenueCents: number;
  }>;
}
