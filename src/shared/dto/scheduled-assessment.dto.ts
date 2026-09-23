/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at frontend-repo/src/shared/dto/scheduled-assessment.dto.ts.
 *
 * Scheduled company-assessment DTOs (assessment lifecycle, Phase 2).
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminCreateScheduledAssessmentDto {
  /** Owning company, or omitted for a platform-wide assessment (all students). */
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  mockTestId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsISO8601()
  scheduledAt!: string;

  /** Hard close of the assessment window. */
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsISO8601()
  registrationCloseAt?: string;

  @IsOptional()
  @IsBoolean()
  proctored?: boolean;

  /** Auto-submit after N proctoring warnings (default off). */
  @IsOptional()
  @IsBoolean()
  proctorAutoSubmit?: boolean;

  /** The N in "auto-submit after N warnings" (1-10, default 3). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  proctorMaxWarnings?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateScheduledAssessmentDto {
  @IsOptional() @IsUUID() mockTestId?: string | null;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsISO8601() scheduledAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string | null;
  @IsOptional() @IsInt() @Min(5) @Max(600) durationMinutes?: number;
  @IsOptional() @IsISO8601() registrationCloseAt?: string | null;
  @IsOptional() @IsBoolean() proctored?: boolean;
  @IsOptional() @IsBoolean() proctorAutoSubmit?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(10) proctorMaxWarnings?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/**
 * Build an admin drive by SAMPLING the question bank — the same MCQ-round / coding-round
 * flow the TPO Assessment Center uses (mode → sections → coding topics → counts), so the
 * admin creator matches the TPO panel. Content is assembled server-side into a mock, then
 * scheduled. `cohortId` (optional) targets a single INDIVIDUAL (non-college) cohort — the
 * drive is then visible only to that cohort's members.
 */
export class AdminBuildAssessmentDto {
  @IsIn(['SECTIONAL', 'COMPANY'])
  mode!: string;

  /** Required for COMPANY mode — scopes the bank to that company's tagged questions. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  companySlug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsInt()
  @Min(5)
  @Max(300)
  durationMinutes!: number;

  /** Percent of the paper's total marks a student must score to pass. Omitted = 60,
   *  the value the builder used to hard-code — so an old client behaves as before. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passingScore?: number;

  /** MCQ round size. 0 (or omitted) = no MCQ round. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  mcqCount?: number;

  /** Coding round size. 0 (or omitted) = no coding round. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  codingCount?: number;

  /** Restrict MCQ sampling to one difficulty band. Omit / 'MIXED' = all bands. */
  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  difficulty?: string;

  /** Restrict CODING sampling to one difficulty band. Omit / 'MIXED' = all bands. */
  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  codingDifficulty?: string;

  @IsOptional()
  @IsBoolean()
  proctored?: boolean;

  @IsOptional()
  @IsBoolean()
  proctorAutoSubmit?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  proctorMaxWarnings?: number;

  /** Per-assessment lock toggles threaded onto the built mock (default sub ON, profile OFF). */
  @IsOptional()
  @IsBoolean()
  subscriptionLockEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  profileLockEnabled?: boolean;

  /** Target a single individual (non-college) cohort — members-only visibility. */
  @IsOptional()
  @IsUUID()
  cohortId?: string;

  /** Restrict MCQ sampling to these sections/topics (their whole subtree is included). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  topicIds?: string[];

  /** Restrict CODING sampling to these coding topics (primary tags). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  codingTopics?: string[];
}

/** Live "questions available" preview for the admin builder (a subset of build). */
export class PreviewBuildAssessmentDto {
  @IsIn(['SECTIONAL', 'COMPANY'])
  mode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companySlug?: string;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  difficulty?: string;

  /** Restrict CODING availability to one difficulty band. Omit / 'MIXED' = all bands. */
  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD', 'MIXED'])
  codingDifficulty?: string;

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
}

/** Response shape (joined with company). */
export class ScheduledAssessmentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'null = platform-wide' }) companyId!: string | null;
  @ApiPropertyOptional() companySlug!: string | null;
  @ApiProperty() companyName!: string;
  @ApiPropertyOptional() companyLogoUrl!: string | null;
  @ApiPropertyOptional() mockTestId!: string | null;
  @ApiProperty() title!: string;
  @ApiPropertyOptional() description!: string | null;
  @ApiPropertyOptional() instructions!: string | null;
  @ApiProperty() scheduledAt!: string;
  @ApiPropertyOptional() endsAt!: string | null;
  @ApiProperty() durationMinutes!: number;
  @ApiPropertyOptional() registrationCloseAt!: string | null;
  @ApiProperty() proctored!: boolean;
  /** When true, the runner auto-submits after `proctorMaxWarnings` warnings. */
  @ApiProperty() proctorAutoSubmit!: boolean;
  @ApiProperty() proctorMaxWarnings!: number;
  @ApiProperty() isActive!: boolean;
  /** When publish stamped it — null means its audience was never emailed. */
  @ApiPropertyOptional() publishedAt!: string | null;
  /** Student calendar only: true = visible-locked (not entitled to open/attempt). */
  @ApiPropertyOptional() locked?: boolean;
}

/** Admin/super-admin: release (or re-embargo) a drive's scored results to students. */
export class AdminReleaseResultsDto {
  @IsOptional()
  @IsBoolean()
  released?: boolean;
}
