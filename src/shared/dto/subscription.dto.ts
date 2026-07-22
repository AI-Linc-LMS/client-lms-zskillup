/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Subscription plan catalog + college subscription lifecycle (Phase 4). Gated
 * server-side by @RequireCapability('canManageSubscriptions'). `import type` on
 * the frontend so the class-validator runtime never fires client-side.
 */
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
