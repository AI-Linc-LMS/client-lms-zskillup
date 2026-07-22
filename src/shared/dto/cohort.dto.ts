/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/cohort.dto.ts.
 *
 * Cohorts (Batch 4). A cohort groups a college's students. TPO creates/lists
 * cohorts and imports students into them; Admin one-time-seeds an approved
 * request's student list into a new cohort.
 */
import { Transform } from 'class-transformer';
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
  collegeId: string;
  name: string;
  description: string | null;
  year: number | null;
  branch: string | null;
  studentCount: number;
  createdAt: string;
}
