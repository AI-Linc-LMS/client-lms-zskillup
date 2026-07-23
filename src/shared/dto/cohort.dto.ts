/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/cohort.dto.ts.
 *
 * Cohorts (Batch 4). A cohort groups a college's students. TPO creates/lists
 * cohorts and imports students into them; Admin one-time-seeds an approved
 * request's student list into a new cohort.
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCohortDto {
  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsInt() @Min(1900) @Max(2100)
  year?: number;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(20)
  branch?: string;
}

/** Assign existing college students to a cohort (bulk membership move). */
export class AssignCohortMembersDto {
  @IsArray() @ArrayMaxSize(1000) @IsUUID('all', { each: true })
  userIds!: string[];
}

/** Admin one-time import of an approved request's student list into a new cohort. */
export class ImportRequestStudentsDto {
  @IsOptional() @Transform(trimString) @IsString() @MinLength(2) @MaxLength(160)
  cohortName?: string;

  @IsOptional() @IsInt() @Min(1900) @Max(2100)
  year?: number;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(20)
  branch?: string;
}

export interface CohortDto {
  id: string;
  /** Null for an individual (non-college) cohort. */
  collegeId: string | null;
  name: string;
  description: string | null;
  year: number | null;
  branch: string | null;
  studentCount: number;
  createdAt: string;
}

// ── Individual (non-college) cohorts ─────────────────────────────────────────

/** Create an individual (non-college) cohort - just a name + optional description. */
export class CreateIndividualCohortDto {
  @Transform(trimString) @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(500)
  description?: string;
}

export class IndividualCohortEntryDto {
  @Transform(trimString) @IsString() @MaxLength(200)
  email!: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(160)
  fullName?: string;
}

/** Add users to an individual cohort by email. Existing non-college users are
 *  assigned; unknown emails are invited as new (non-college) students. */
export class AddIndividualCohortUsersDto {
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => IndividualCohortEntryDto)
  entries!: IndividualCohortEntryDto[];
}

export interface IndividualCohortMemberDto {
  id: string;
  fullName: string | null;
  email: string;
  status: string;
}

export interface AddCohortUsersResultDto {
  added: number;
  invited: number;
  skipped: number;
  rows: Array<{ email: string; status: 'added' | 'invited' | 'skipped' | 'invalid'; reason?: string }>;
}
