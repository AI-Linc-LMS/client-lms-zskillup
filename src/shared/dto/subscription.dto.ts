/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Subscription plan catalog + college subscription lifecycle (Phase 4). Gated
 * server-side by @RequireCapability('canManageSubscriptions'). `import type` on
 * the frontend so the class-validator runtime never fires client-side.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CollegeSubscriptionKind } from '../enums';
import type { EntitlementDto } from './payments.dto';

// ─── Plan catalog ────────────────────────────────────────────────────────────

export class CreateSubscriptionPlanDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  /** Price in minor units (paise/cents). 0 = free. */
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  priceCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  /** Max seats. 0 = unlimited. */
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  seatLimit!: number;

  /** Validity length in days. Omit / null = perpetual. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateSubscriptionPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  seatLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// ─── College subscription lifecycle ──────────────────────────────────────────

/** Assign (or replace) a college's subscription from a catalog plan. */
export class AssignSubscriptionDto {
  @IsUUID()
  collegeId!: string;

  @IsUUID()
  planId!: string;

  /** Override the plan's seat limit for this college (optional). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  seatLimit?: number;
}

/** Extend a subscription's validity by N days. */
export class ExtendSubscriptionDto {
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;
}

/** Start a time-boxed trial for a college. */
export class StartTrialDto {
  @IsUUID()
  collegeId!: string;

  @IsOptional()
  @IsUUID()
  planId?: string;

  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export interface SubscriptionPlanDto {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  seatLimit: number;
  durationDays: number | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CollegeSubscriptionDto {
  id: string;
  collegeId: string;
  collegeName: string | null;
  planId: string | null;
  planName: string;
  seatLimit: number;
  seatsUsed: number;
  /** Effective status - EXPIRED is computed when expiresAt has passed. */
  status: string;
  isTrial: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

// --- College subscription SCOPE (what students actually inherit) -------------

/**
 * Set/replace what a college's subscription unlocks. Exactly one kind; the server
 * diffs this against the college's live COLLEGE_INHERITED entitlements - adding a
 * company grants it to every student immediately, removing one revokes it. Personal
 * purchases and B2B (Razorpay) college purchases are never touched.
 */
export class UpdateCollegeSubscriptionScopeDto {
  @IsEnum(CollegeSubscriptionKind)
  kind!: CollegeSubscriptionKind;

  /** Required (1..50) when kind = COMPANY; must be empty/omitted for PLATFORM. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, { message: 'Up to 50 companies per college' })
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+$/, {
    each: true,
    message: 'company slug must be lowercase letters, digits, and dashes only',
  })
  companySlugs?: string[];

  /** New validity from now, in months. Omit to keep the current expiry untouched. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths?: number;

  /** Omit to keep the current seat limit. 0 = unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  seatLimit?: number;
}

/** What a college's subscription grants, plus the live entitlement rows behind it. */
export interface CollegeSubscriptionScopeDto {
  collegeId: string;
  collegeName: string | null;
  /** NULL when no scope has been set - nothing is minted in that state. */
  kind: CollegeSubscriptionKind | null;
  companySlugs: string[];
  companies: Array<{ slug: string; name: string }>;
  planName: string | null;
  seatLimit: number;
  seatsUsed: number;
  /** Effective status of tenancy.subscriptions - ACTIVE | EXPIRED | CANCELLED. */
  status: string | null;
  startsAt: string | null;
  /** null = perpetual. */
  expiresAt: string | null;
  /** Every COLLEGE-subject grant on this college, whatever its source. */
  entitlements: EntitlementDto[];
}

/** What one scope change actually did - surfaced to the operator verbatim. */
export interface CollegeEntitlementSyncResultDto {
  granted: string[];
  revoked: string[];
  kept: string[];
}
