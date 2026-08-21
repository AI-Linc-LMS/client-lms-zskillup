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
  IsUUID,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JobApplicationStatus, JobStatus, WorkMode } from '../enums';

export class CreateJobPostingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  companyName!: string;

  /** Derived from title + company when omitted. Constrained to what a URL can carry:
   *  anything else slugifies to '' or to something unrecognisable, and the result is
   *  then held forever by the unique index. */
  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and single hyphens',
  })
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

/** A student's own view of an application they submitted. */
export interface JobApplicationDto {
  id: string;
  jobId: string;
  jobSlug: string;
  jobTitle: string;
  companyName: string;
  status: JobApplicationStatus;
  appliedAt: string;
  statusChangedAt: string | null;
}

/** The admin's view of one applicant. */
export interface JobApplicantDto extends JobApplicationDto {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  note: string | null;
}

export class UpdateJobApplicationDto {
  @IsOptional()
  @IsEnum(JobApplicationStatus)
  status?: JobApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}

/** Admin sending a one-off email to a single applicant, outside the automated
 *  triggers. Deliberately plain text: an admin composing arbitrary HTML that lands in
 *  a student's inbox is a phishing surface we do not need. */
export class SendApplicantEmailDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}
