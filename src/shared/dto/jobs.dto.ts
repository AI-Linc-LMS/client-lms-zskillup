/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Job board — public postings plus the admin authoring surface. Browsing is open to
 * everyone (including logged out); applying is gated separately.
 */
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JobStatus, WorkMode } from '../enums';

export class CreateJobPostingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  companyName!: string;

  /** Derived from title + company when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string | null;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode | null;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  companyLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  employmentType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  salary?: string | null;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hiringProcess?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passoutYears?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  openings?: number | null;

  /** External application site. When set, the in-portal apply flow is bypassed. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  applyUrl?: string | null;

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string | null;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}

export class UpdateJobPostingDto extends CreateJobPostingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  declare title: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  declare companyName: string;
}

export interface JobPostingDto {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  excerpt: string | null;
  workMode: WorkMode | null;
  companyId: string | null;
  companyLogoUrl: string | null;
  location: string | null;
  employmentType: string | null;
  experience: string | null;
  salary: string | null;
  description: string;
  hiringProcess: string | null;
  skills: string[];
  passoutYears: string[];
  openings: number | null;
  applyUrl: string | null;
  applicationDeadline: string | null;
  status: JobStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
