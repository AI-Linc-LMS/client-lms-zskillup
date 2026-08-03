/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/college-request.dto.ts.
 *
 * College onboarding request (Batch 2). An internal ADMIN drafts a request
 * (college details + subscription plan + TPO contact + shared student list); a
 * SUPER_ADMIN approves (creating the College) or rejects with a reason. The
 * student rows reuse the TPO invite shape and are sanitized server-side.
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CollegeRequestStatus, CollegeSubscriptionKind } from '../enums';
import { TpoInvitationRowDto } from './tpo.dto';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_RULE = { message: 'slug must be lowercase letters, digits, and dashes only' };
const COMPANY_SLUG_RULE = {
  message: 'company slug must be lowercase letters, digits, and dashes only',
};

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const normaliseEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateCollegeRequestDto {
  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(200)
  collegeName!: string;

  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  collegeSlug!: string;

  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  state!: string;

  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  city!: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(500)
  logoUrl?: string;

  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(200)
  contactName!: string;

  @Transform(normaliseEmail) @IsEmail() @MaxLength(254)
  contactEmail!: string;

  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  planName!: string;

  @IsInt() @Min(0) @Max(100000)
  seatLimit!: number;

  @IsOptional() @IsInt() @Min(1) @Max(120)
  durationMonths?: number;

  /** What the college is buying - Full Platform OR a set of company hubs. */
  @IsOptional() @IsEnum(CollegeSubscriptionKind)
  subscriptionKind?: CollegeSubscriptionKind;

  /** Company slugs, required (1..50) when subscriptionKind is COMPANY. */
  @IsOptional() @IsArray() @ArrayMaxSize(50, { message: 'Up to 50 companies per college' })
  @IsString({ each: true }) @Matches(SLUG_REGEX, { each: true, ...COMPANY_SLUG_RULE })
  subscriptionCompanySlugs?: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one student' })
  @ArrayMaxSize(5000, { message: 'Up to 5000 students per request' })
  @ValidateNested({ each: true })
  @Type(() => TpoInvitationRowDto)
  students!: TpoInvitationRowDto[];
}

/** Edit a DRAFT or REJECTED request before (re)submitting - every field optional. */
export class UpdateCollegeRequestDto {
  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(200)
  collegeName?: string;

  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, SLUG_RULE)
  collegeSlug?: string;

  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  state?: string;

  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  city?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(500)
  logoUrl?: string;

  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(200)
  contactName?: string;

  @IsOptional() @Transform(normaliseEmail) @IsEmail() @MaxLength(254)
  contactEmail?: string;

  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(100)
  planName?: string;

  @IsOptional() @IsInt() @Min(0) @Max(100000)
  seatLimit?: number;

  @IsOptional() @IsInt() @Min(1) @Max(120)
  durationMonths?: number;

  @IsOptional() @IsEnum(CollegeSubscriptionKind)
  subscriptionKind?: CollegeSubscriptionKind;

  @IsOptional() @IsArray() @ArrayMaxSize(50, { message: 'Up to 50 companies per college' })
  @IsString({ each: true }) @Matches(SLUG_REGEX, { each: true, ...COMPANY_SLUG_RULE })
  subscriptionCompanySlugs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000, { message: 'Up to 5000 students per request' })
  @ValidateNested({ each: true })
  @Type(() => TpoInvitationRowDto)
  students?: TpoInvitationRowDto[];
}

export class RejectCollegeRequestDto {
  @Transform(trimString) @IsString() @MinLength(3) @MaxLength(1000)
  reason!: string;
}

/** List-row shape (summary - omits the full student array for cheap lists). */
export interface CollegeRequestSummaryDto {
  id: string;
  collegeName: string;
  collegeSlug: string;
  state: string;
  city: string;
  logoUrl: string | null;
  contactName: string;
  contactEmail: string;
  planName: string;
  seatLimit: number;
  durationMonths: number | null;
  /** NULL on legacy requests drafted before the subscription picker existed. */
  subscriptionKind: CollegeSubscriptionKind | null;
  subscriptionCompanySlugs: string[];
  studentCount: number;
  status: CollegeRequestStatus;
  rejectionReason: string | null;
  submittedBy: string;
  reviewedBy: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  collegeId: string | null;
  activatedAt: string | null;
  subscriptionId: string | null;
  studentsImportedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Detail shape - summary plus the full pending student list. */
export interface CollegeRequestDetailDto extends CollegeRequestSummaryDto {
  students: Array<{ email: string; fullName?: string | null; rollNumber?: string | null }>;
  /**
   * The selected companies resolved to display names, so the Super Admin's review
   * pane can show exactly what it is about to grant without a second round-trip.
   * A slug that no longer resolves (company archived/renamed) still appears, with
   * the slug as its name - better a visible oddity than a silently dropped grant.
   */
  subscriptionCompanies: Array<{ slug: string; name: string }>;
}
