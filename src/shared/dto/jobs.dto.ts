/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Job board — public postings plus the admin authoring surface. Browsing is open to
 * everyone (including logged out); applying is gated separately.
 */
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CompensationKind,
  CompensationStructure,
  EmploymentType,
  JobApplicationStatus,
  JobKind,
  JobQuestionKind,
  JobStatus,
  JobTargetType,
  WorkMode,
} from '../enums';

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
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType | null;

  @IsOptional()
  @IsEnum(JobKind)
  jobKind?: JobKind;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  experience?: string | null;

  /** @deprecated free-text compensation, kept so nothing already typed is lost.
   *  New postings use compensationKind + the numeric fields below. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  salary?: string | null;

  /* --- compensation. Whole rupees, in the unit the employer quotes: per YEAR for a
   *     salary, per MONTH for a stipend. --- */

  @IsOptional()
  @IsEnum(CompensationKind)
  compensationKind?: CompensationKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stipendAmount?: number | null;

  /* --- internship-specific (jobKind = INTERNSHIP). Free-text ranges + remarks. --- */

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(60)
  internshipDuration?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(120)
  stipendRange?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(CompensationStructure)
  stipendStructure?: CompensationStructure | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  stipendRemarks?: string | null;

  @IsOptional()
  @IsBoolean()
  hasPpo?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(120)
  ppoCtc?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(CompensationStructure)
  ppoStructure?: CompensationStructure | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  ppoRemarks?: string | null;

  /* --- the rest of the posting --- */

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  aboutCompany?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  jdFileUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  jdFileName?: string | null;

  /** Ordered selection stages. Free strings: every employer names these differently. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  hiringStages?: string[];

  /* --- per-job related content (composer wizard): specific testimonials + blogs --- */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  testimonialIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  blogIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('all', { each: true })
  placementIds?: string[];

  /* --- eligibility --- */

  @IsOptional()
  @IsString()
  @MaxLength(255)
  education?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  departments?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ugRequirement?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pgRequirement?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  otherRequirements?: string | null;

  /** Visibility, separate from lifecycle `status`. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;

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

/**
 * The VALIDATION shape for a PATCH. Every field is @IsOptional, so the server accepts
 * a partial body.
 *
 * TypeScript cannot express that on a subclass - a derived class may not widen a
 * required property - so `title` and `companyName` stay required in the TYPE even
 * though the validators do not require them. Callers should use `JobPostingPatch`
 * below, which is the honest shape; this class exists to carry the decorators.
 */
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

/**
 * What a caller may actually send to PATCH a posting: any subset.
 *
 * Flipping a status or publishing should not require re-sending a title the caller
 * never touched - and re-sending it is not harmless, because two admins editing the
 * same posting would then overwrite each other's fields with stale values.
 */
export type JobPostingPatch = Partial<CreateJobPostingDto>;

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
  employmentType: EmploymentType | null;
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
  /** Visibility, separate from lifecycle `status`. */
  isPublished: boolean;
  jobKind: JobKind;

  /* compensation - whole rupees, per YEAR for a salary and per MONTH for a stipend */
  compensationKind: CompensationKind;
  salaryMin: number | null;
  salaryMax: number | null;
  stipendAmount: number | null;
  /* internship-specific (jobKind = INTERNSHIP) */
  internshipDuration: string | null;
  stipendRange: string | null;
  stipendStructure: CompensationStructure | null;
  stipendRemarks: string | null;
  hasPpo: boolean;
  ppoCtc: string | null;
  ppoStructure: CompensationStructure | null;
  ppoRemarks: string | null;

  aboutCompany: string | null;
  jdFileUrl: string | null;
  jdFileName: string | null;
  hiringStages: string[];

  /* per-job related content: specific testimonials + blogs + placements chosen in the composer */
  testimonialIds: string[];
  blogIds: string[];
  placementIds: string[];

  /* eligibility */
  education: string | null;
  departments: string[];
  ugRequirement: string | null;
  pgRequirement: string | null;
  otherRequirements: string | null;

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
  /** The candidate's own cover note. */
  note: string | null;
  /** The candidate's own words. Kept separate from `note`, which is staff-only, so an
   *  admin's private assessment can never surface on a screen the candidate can see. */
  coverNote: string | null;
  /** Their ZSkillup resume, if they attached one. */
  resumeId: string | null;
  /** Or a resume they uploaded / host themselves. */
  resumeUrl: string | null;
  /** The uploaded resume's original filename, when they uploaded a PDF. */
  resumeName: string | null;
  /** Answers to this posting's questions, in the order they were asked. */
  answers: Array<{ label: string; answer: string }>;
}

/** How many applicants sit in each status for one job. Dense - every status present,
 *  missing ones as 0 - so the filter chips can render a true total per status. */
export type JobApplicantFacetsDto = Record<JobApplicationStatus, number>;

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

/* ---------------------------------------------------------------------------
 * The board: filters, targeting, questions
 * ------------------------------------------------------------------------- */

/**
 * What a student can narrow the board by. Every field is optional and they AND
 * together - unlike targeting, where rows OR.
 */
export class JobBoardFilters {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(WorkMode, { each: true })
  workMode?: WorkMode[];

  @IsOptional()
  @IsArray()
  @IsEnum(EmploymentType, { each: true })
  employmentType?: EmploymentType[];

  @IsOptional()
  @IsEnum(JobKind)
  jobKind?: JobKind;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /** Matched as a substring against the posting's free-text experience field. It is
   *  free text on the posting ("0-2 years", "Fresher"), so this cannot be a range
   *  comparison without parsing prose - and a wrong parse silently hides jobs. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  experience?: string;

  /** Match ANY of these skills, not all - a student who knows React should see a role
   *  asking for React and Node, not only roles asking for exactly what they picked. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  skills?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  passoutYear?: number;

  /** Only roles still taking applications today. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/** One audience row on a posting. */
export class JobTargetDto {
  @IsEnum(JobTargetType)
  targetType!: JobTargetType;

  @IsUUID()
  targetId!: string;
}

/** The full audience for a posting. Replace-in-full, never a diff: the composer holds
 *  the whole set, and a diff API cannot tell "removed" from "not sent" - which would
 *  leave a posting visible to a college the admin believes they just removed. */
export class SetJobTargetsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobTargetDto)
  targets!: JobTargetDto[];
}

/** An audience row as the admin screen renders it - resolved to a human name. */
export interface JobTargetViewDto {
  targetType: JobTargetType;
  targetId: string;
  /** Null when the college/cohort/student it pointed at no longer exists. The row is
   *  inert in that case (it can never match), and the UI says so rather than showing
   *  a bare uuid. */
  label: string | null;
}

/** A question in the reusable library. */
export interface JobQuestionDto {
  id: string;
  label: string;
  helpText: string | null;
  kind: JobQuestionKind;
  options: string[];
  isBuiltin: boolean;
}

/** A question as it is attached to one posting. */
export interface JobPostingQuestionDto extends JobQuestionDto {
  isRequired: boolean;
  sortOrder: number;
}

export class UpsertJobQuestionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  helpText?: string | null;

  @IsEnum(JobQuestionKind)
  kind!: JobQuestionKind;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  options?: string[];
}

/** Which questions a posting asks, and whether each is mandatory. */
export class SetJobQuestionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobPostingQuestionSelectionDto)
  questions!: JobPostingQuestionSelectionDto[];
}

export class JobPostingQuestionSelectionDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** One answer a student gives while applying. */
export class JobAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsString()
  @MaxLength(4000)
  answer!: string;
}

/** The apply payload. Empty for a posting that asks nothing. */
export class ApplyToJobDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobAnswerDto)
  answers?: JobAnswerDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** Their ZSkillup resume. A reference, not an upload - see migration 103. */
  @IsOptional()
  @IsUUID()
  resumeId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resumeUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  resumeName?: string | null;
}
