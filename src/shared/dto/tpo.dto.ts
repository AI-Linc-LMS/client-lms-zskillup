/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/tpo.dto.ts.
 *
 * TPO endpoints (Implementation Plan §4). v1 ships the bulk-invite flow;
 * dashboard + at-risk + reports land in Sprint 7 once PPS is computable.
 *
 * Sprint 1 - TPO bulk-invite by CSV. The wire format is plain rows so the
 * frontend can upload a CSV directly; we sanitize against CSV injection
 * server-side (SECURITY_STANDARDS §4 - leading `=`, `+`, `@`, `-` is escaped).
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const normaliseEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class TpoInvitationRowDto {
  // Email FORMAT is validated per-row inside TpoService (not via @IsEmail) so a
  // single malformed CSV row is reported as `invalid` rather than 400-ing the
  // whole batch - bulk CSV uploads routinely contain a few bad rows.
  @Transform(normaliseEmail)
  @IsString()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(50)
  rollNumber?: string;

  /** Free-form branch (e.g. "CSE", "Computer Science"); mapped to the branch
   *  enum server-side so department analytics have coverage pre-onboarding. */
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  branch?: string;
}

export class TpoBulkInviteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one student' })
  @ArrayMaxSize(500, { message: 'Upload up to 500 students per batch' })
  @ValidateNested({ each: true })
  @Type(() => TpoInvitationRowDto)
  invitations!: TpoInvitationRowDto[];

  /** Optional cohort to import these students into (must belong to the caller's college). */
  @IsOptional()
  @IsUUID()
  cohortId?: string;
}

export interface TpoBulkInviteResult {
  /** Number of new invitations created. */
  created: number;
  /** Number skipped because the email is already registered (any role). */
  skipped: number;
  /** Per-row outcome for client-side reporting. */
  rows: Array<{
    email: string;
    status: 'created' | 'skipped' | 'invalid';
    reason?: string;
  }>;
}

/** Record a real placement outcome for a student (TPO). */
export class CreateTpoPlacementDto {
  @IsUUID()
  studentId!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  companyName!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(160)
  role?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  ctcLpa?: number;

  @IsOptional()
  @IsIn(['FULL_TIME', 'INTERNSHIP', 'PPO'])
  offerType?: string;

  @IsOptional()
  @IsIn(['OFFERED', 'ACCEPTED', 'DECLINED'])
  status?: string;

  @IsOptional()
  @IsDateString()
  offerDate?: string;
}

/** Create a college assessment (TPO Assessment Center). Content is sampled from
 *  the bank by mode: SECTIONAL (broad MCQ + coding) or COMPANY (that company's
 *  tagged questions). */
export class CreateTpoAssessmentDto {
  @IsIn(['SECTIONAL', 'COMPANY'])
  mode!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  companySlug?: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsNumber()
  @Min(5)
  @Max(300)
  durationMinutes!: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  mcqCount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  codingCount?: number;

  /** Restrict MCQ sampling to one difficulty band. Omit (or 'MIXED') = all bands. */
  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  difficulty?: string;

  @IsOptional()
  @IsBoolean()
  proctored?: boolean;

  @IsOptional()
  @IsUUID()
  cohortId?: string;

  /** SECTIONAL mode: restrict MCQ sampling to these sections/topics (their whole
   *  subtree is included). Empty = sample across every section. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  topicIds?: string[];

  /** Restrict CODING sampling to these coding topics (primary tags). Empty = the
   *  whole coding bank for the scope (company-tagged, or all in sectional mode). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  codingTopics?: string[];
}

/** Input for the live "questions available" preview (a subset of create). */
export class PreviewTpoAssessmentDto {
  @IsIn(['SECTIONAL', 'COMPANY'])
  mode!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  companySlug?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  topicIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  codingTopics?: string[];

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  difficulty?: string;
}

/** How many questions the current selection actually has. */
export interface TpoAssessmentAvailability {
  mcqAvailable: number;
  codingAvailable: number;
}
