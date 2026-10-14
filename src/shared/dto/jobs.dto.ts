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
  IsIn,
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
  DriveApprovalStatus,
  DriveAudienceMode,
  DrivePriority,
  EmployerType,
  EmploymentType,
  IneligibleDisplay,
  JobApplicationStatus,
  JobKind,
  JobQuestionKind,
  JobStatus,
  JobTargetType,
  WorkMode,
} from '../enums';
import {
  EligibilityField,
  EligibilityOperator,
  MissingDataPolicy,
  type EligibilityRuleSet,
} from '../drive-eligibility';
import { RoundKind, type PlannedRound } from '../drive-rounds';
import { DriveStatus } from '../drive-lifecycle';
import { ApplicationStage } from '../application-pipeline';
import {
  BulkAction,
  CandidateSortKey,
  MAX_BULK_SIZE,
  MAX_PAGE_SIZE,
  SavedView,
} from '../candidate-search';

/** One hard-eligibility criterion (PRD §4 "Eligibility"). See shared/drive-eligibility.ts
 *  for what each operator means and why missing data is never a failure. */
export class EligibilityRuleDto {
  @IsEnum(EligibilityField) field!: EligibilityField;
  @IsEnum(EligibilityOperator) operator!: EligibilityOperator;
  /** Number for a numeric field, text for a categorical one — hence the loose type. */
  @IsOptional() value?: number | string | null;
  @IsOptional() @IsInt() valueMax?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(120, { each: true })
  options?: string[];
  @IsOptional() @IsString() @MaxLength(120) label?: string | null;
  /** Mandatory for a sensitive field; enforced by validateRuleSet, not by decorators,
   *  because the requirement depends on WHICH field was chosen. */
  @IsOptional() @IsString() @MaxLength(500) justification?: string | null;
}

export class EligibilityRuleSetDto {
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => EligibilityRuleDto)
  rules!: EligibilityRuleDto[];

  @IsEnum(MissingDataPolicy) missingDataPolicy!: MissingDataPolicy;
}

/** One round the drive plans to run (PRD §4 "Drive operations"). */
export class PlannedRoundDto {
  @IsString() @MinLength(1) @MaxLength(64) id!: string;
  @IsEnum(RoundKind) kind!: RoundKind;
  @IsOptional() @IsString() @MaxLength(120) name?: string | null;
  @IsInt() @Min(1) @Max(50) sequence!: number;
  @IsOptional() @IsDateString() tentativeDate?: string | null;
  @IsOptional() @IsDateString() finalDate?: string | null;
  @IsOptional() @IsString() @MaxLength(255) venue?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) meetingLink?: string | null;
  @IsOptional() @IsInt() @Min(1) durationMinutes?: number | null;
  @IsOptional() @IsString() @MaxLength(5000) instructions?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string | null;
  @IsOptional() @IsBoolean() isPrephaszHosted?: boolean;
}

/**
 * Per-drive match weights (PRD §6: "weights must be configurable per role and total
 * 100%"). Stored under `matching_config.weights`; the server rejects a set that does not
 * total 100, because a set that does not is not a weighting — it silently rescales every
 * score without saying so.
 */
export class MatchWeightsDto {
  @IsOptional() @IsInt() @Min(0) @Max(100) APTITUDE?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) TECHNICAL?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) COMMUNICATION?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) RESUME?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) INTERVIEW_READINESS?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) PLACEMENT_READINESS?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) CUSTOM_QUESTIONS?: number;
}

/**
 * An authorised override of a candidate's computed match score (PRD §6).
 * The reason is required — an override without one is indistinguishable from a mistake.
 */
export class SetMatchOverrideDto {
  @IsUUID()
  userId!: string;

  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason!: string;
}

/** Move one candidate through the drive's pipeline (PRD §10). */
export class MoveApplicationStageDto {
  @IsEnum(ApplicationStage)
  to!: ApplicationStage;

  /** Required for rejections, holds, waitlists and no-shows — the server decides which,
   *  since it depends on the target stage rather than on this field. */
  @IsOptional() @IsString() @MaxLength(2000) reason?: string | null;

  /** What the panel or employer said, kept apart from the internal reason. */
  @IsOptional() @IsString() @MaxLength(5000) feedback?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(100) score?: number | null;

  /** Which of the drive's planned rounds — required when moving to IN_ROUND. */
  @IsOptional() @IsString() @MaxLength(64) roundId?: string | null;
}

/** The same move, applied to several candidates (PRD §15). */
export class BulkMoveApplicationStageDto extends MoveApplicationStageDto {
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  applicationIds!: string[];
}

/** Invite a subset of a drive's candidates into one of its rounds (PRD §12). */
export class InviteToRoundDto {
  @IsString() @MinLength(1) @MaxLength(64) roundId!: string;

  @IsArray() @ArrayMaxSize(500) @IsUUID('4', { each: true })
  applicationIds!: string[];
}

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

  /** Curated "Prephasz Opportunity" (true) vs aggregated "Other Opportunity" (false). */
  @IsOptional()
  @IsBoolean()
  isPrephaszOpportunity?: boolean;

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

  /* ── PRD §4: the full placement DRIVE record ───────────────────────────────
   * Grouped as the PRD groups them. All optional: the job board posts roles with
   * none of this, and a campus drive fills it in. */

  // Identity & ownership
  @IsOptional() @IsString() @MaxLength(32) driveCode?: string | null;
  @IsOptional() @IsString() @MaxLength(120) owningTeam?: string | null;
  @IsOptional() @IsString() @MaxLength(200) campusScope?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) internalNotes?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(40, { each: true })
  tags?: string[];

  // Employer details
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsUrl({ require_tld: false }) @MaxLength(500)
  companyWebsite?: string | null;
  @IsOptional() @IsString() @MaxLength(120) companyIndustry?: string | null;
  @IsOptional() @IsString() @MaxLength(160) hrContactName?: string | null;
  @IsOptional() @IsString() @MaxLength(120) hrContactDesignation?: string | null;
  @IsOptional() @IsString() @MaxLength(255) hrContactEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(32) hrContactPhone?: string | null;
  @IsOptional() @IsString() @MaxLength(160) hiringManager?: string | null;
  @IsOptional() @IsEnum(EmployerType) employerType?: EmployerType | null;
  @IsOptional() @IsUUID() relationshipOwnerId?: string | null;
  @IsOptional() @IsBoolean() isConfidential?: boolean;

  // Role details
  @IsOptional() @IsString() @MaxLength(160) departmentFunction?: string | null;
  @IsOptional() @IsString() @MaxLength(20000) responsibilities?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(60, { each: true })
  preferredSkills?: string[];
  @IsOptional() @IsString() @MaxLength(120) roleCategory?: string | null;
  @IsOptional() @IsString() @MaxLength(255) travelRequirements?: string | null;
  @IsOptional() @IsString() @MaxLength(160) shiftTiming?: string | null;
  @IsOptional() @IsDateString() joiningDate?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) probationDetails?: string | null;

  // Compensation
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsEnum(CompensationStructure) ctcStructure?: CompensationStructure | null;
  @IsOptional() @IsInt() @Min(0) ctcFixedAmount?: number | null;
  @IsOptional() @IsInt() @Min(0) ctcVariableAmount?: number | null;
  @IsOptional() @IsString() @MaxLength(5000) benefits?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) bonusDetails?: string | null;

  /** Hard eligibility — academics and the rest (shared/drive-eligibility.ts). */
  @IsOptional() @ValidateNested() @Type(() => EligibilityRuleSetDto)
  eligibilityRules?: EligibilityRuleSetDto;

  // Application settings
  @IsOptional() @IsDateString() applicationOpensAt?: string | null;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsInt() @Min(1) maxApplications?: number | null;
  @IsOptional() @IsBoolean() allowLateApplication?: boolean;
  @IsOptional() @IsBoolean() allowApplicationEdit?: boolean;
  @IsOptional() @IsBoolean() resumeRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(10000) applicationInstructions?: string | null;

  // Access & visibility
  @IsOptional() @IsEnum(DriveAudienceMode) audienceMode?: DriveAudienceMode;
  @IsOptional() @IsEnum(IneligibleDisplay) ineligibleDisplay?: IneligibleDisplay;
  @IsOptional() @IsBoolean() isHidden?: boolean;
  @IsOptional() @IsDateString() publishAt?: string | null;
  @IsOptional() @IsDateString() unpublishAt?: string | null;

  // Matching & selection
  @IsOptional() @ValidateNested() @Type(() => MatchWeightsDto)
  matchWeights?: MatchWeightsDto;
  @IsOptional() @IsInt() @Min(0) @Max(100) minMatchScore?: number | null;
  @IsOptional() @IsBoolean() scoreVisibleToStaff?: boolean;
  @IsOptional() @IsBoolean() scoreVisibleToStudent?: boolean;
  @IsOptional() @IsInt() @Min(1) shortlistCapacity?: number | null;

  // Drive operations
  @IsOptional() @IsUUID() driveOwnerId?: string | null;
  @IsOptional() @IsUUID() opsOwnerId?: string | null;
  @IsOptional() @IsUUID() tpoOwnerId?: string | null;
  @IsOptional() @IsEnum(DrivePriority) priority?: DrivePriority | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => PlannedRoundDto)
  plannedRounds?: PlannedRoundDto[];
  @IsOptional() @IsString() @MaxLength(255) venue?: string | null;
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsUrl({ require_tld: false }) @MaxLength(1000)
  meetingLink?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) reportingInstructions?: string | null;
  @IsOptional() @IsString() @MaxLength(255) queryContact?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) internalComments?: string | null;
  @IsOptional() @IsString() @MaxLength(160) linkedRequisition?: string | null;

  // Governance
  @IsOptional() @IsEnum(DriveApprovalStatus) approvalStatus?: DriveApprovalStatus;
  @IsOptional() @IsString() @MaxLength(120) jobSource?: string | null;
  @IsOptional() @IsBoolean() dataSharingPermitted?: boolean;
  @IsOptional() @IsBoolean() resumeSharingConsentRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(20000) employerTerms?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) cancellationReason?: string | null;
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
  /**
   * The employer's OWN application site, when they collect applications themselves.
   *
   * PAID CONTENT, and redacted server-side: it is present only for a viewer who passes
   * the same gate as applying through the platform (job-entitlement.ts), and is NULL
   * for everyone else - including every logged-out visitor, because this payload is
   * served from a public route. `applyUrlLocked` tells the client which of the two
   * "null" cases it is looking at, so it can offer the plan instead of the link.
   */
  applyUrl: string | null;
  /** This posting HAS an external apply URL that this viewer may not see. */
  applyUrlLocked: boolean;
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
  isPrephaszOpportunity: boolean;

  /* eligibility */
  education: string | null;
  departments: string[];
  ugRequirement: string | null;
  pgRequirement: string | null;
  otherRequirements: string | null;

  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;

  /* ── PRD §4: the placement DRIVE record ─────────────────────────────────────
   * Split by audience in toDto(). The fields above this line plus the first block
   * below go to everyone; the STAFF-ONLY block is absent entirely for a student
   * (absent, not blanked — this payload is served from a public route). */

  driveCode: string | null;
  tags: string[];
  companyWebsite: string | null;
  companyIndustry: string | null;
  employerType: EmployerType | null;
  departmentFunction: string | null;
  responsibilities: string | null;
  preferredSkills: string[];
  roleCategory: string | null;
  travelRequirements: string | null;
  shiftTiming: string | null;
  joiningDate: string | null;
  probationDetails: string | null;
  currency: string;
  ctcStructure: CompensationStructure | null;
  ctcFixedAmount: number | null;
  ctcVariableAmount: number | null;
  benefits: string | null;
  bonusDetails: string | null;
  /** Criteria are public so an ineligible student can be told why (PRD §8). A sensitive
   *  rule's `justification` is stripped for anyone but staff. */
  eligibilityRules: EligibilityRuleSet;
  applicationOpensAt: string | null;
  timezone: string;
  allowLateApplication: boolean;
  allowApplicationEdit: boolean;
  resumeRequired: boolean;
  applicationInstructions: string | null;
  audienceMode: DriveAudienceMode;
  ineligibleDisplay: IneligibleDisplay;
  /** Staff `notes` on each round are stripped for a student. */
  plannedRounds: PlannedRound[];
  venue: string | null;
  meetingLink: string | null;
  reportingInstructions: string | null;
  queryContact: string | null;

  // ── Staff-only (PRD §17) ──────────────────────────────────────────────────
  owningTeam?: string | null;
  campusScope?: string | null;
  internalNotes?: string | null;
  hrContactName?: string | null;
  hrContactDesignation?: string | null;
  hrContactEmail?: string | null;
  hrContactPhone?: string | null;
  hiringManager?: string | null;
  relationshipOwnerId?: string | null;
  isConfidential?: boolean;
  unpaidApprovedBy?: string | null;
  unpaidApprovedAt?: string | null;
  maxApplications?: number | null;
  isHidden?: boolean;
  publishAt?: string | null;
  unpublishAt?: string | null;
  matchingConfig?: Record<string, unknown>;
  minMatchScore?: number | null;
  scoreVisibleToStaff?: boolean;
  scoreVisibleToStudent?: boolean;
  shortlistCapacity?: number | null;
  driveOwnerId?: string | null;
  opsOwnerId?: string | null;
  tpoOwnerId?: string | null;
  priority?: DrivePriority | null;
  internalComments?: string | null;
  linkedRequisition?: string | null;
  approvalStatus?: DriveApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  jobSource?: string | null;
  dataSharingPermitted?: boolean;
  resumeSharingConsentRequired?: boolean;
  employerTerms?: string | null;
  cancellationReason?: string | null;
  archivedAt?: string | null;
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

  /** Source of the posting: 'prephasz' (curated/partner) vs 'other' (aggregated). */
  @IsOptional()
  @IsIn(['prephasz', 'other'])
  source?: 'prephasz' | 'other';

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

  /** Subtractive rather than additive (PRD §4 "named candidate inclusion/exclusion").
   *  Inclusion rows are OR-ed to WIDEN reach; an exclusion row removes whoever it names
   *  from whatever the inclusions let in, and is applied last. */
  @IsOptional()
  @IsBoolean()
  isExclusion?: boolean;
}

/**
 * Move a drive through its lifecycle (PRD §5).
 *
 * A status move is an event with a reason and an audience, not another field on the edit
 * form — cancelling notifies every applicant and going cold books a date to look again —
 * so it has its own payload and its own route.
 */
export class TransitionDriveDto {
  @IsEnum(DriveStatus)
  to!: DriveStatus;

  /** Required for ON_HOLD and CANCELLED; the server enforces which, since it depends on
   *  the target status rather than on this field. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;

  /** "Cold / On Hold — reason and next review date should be captured." */
  @IsOptional()
  @IsDateString()
  nextReviewDate?: string | null;
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
  /** True when this row REMOVES its audience rather than adding it. */
  isExclusion: boolean;
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

/* ------------------------------------------------------------------------- */
/* §15 — search, saved views and bulk actions                                 */
/* ------------------------------------------------------------------------- */

/**
 * Query for a drive's candidate list (PRD §15).
 *
 * Query strings arrive as text, so every number and boolean is coerced explicitly. A
 * `minScore=60` that stayed the string "60" would compare lexically and quietly match "7".
 */
export class SearchCandidatesDto {
  @IsOptional() @IsEnum(SavedView) view?: SavedView;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsIn(['ELIGIBLE', 'INELIGIBLE', 'NEEDS_REVIEW'])
  eligibility?: 'ELIGIBLE' | 'INELIGIBLE' | 'NEEDS_REVIEW';

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) minScore?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) maxScore?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) minCoverage?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(80, { each: true })
  skills?: string[];
  @IsOptional() @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsUUID() collegeId?: string;
  @IsOptional() @IsString() @MaxLength(120) cohort?: string;
  @IsOptional() @IsString() @MaxLength(120) department?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean() paidAccess?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  placementStatus?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  applicationStatus?: string[];
  @IsOptional() @Type(() => Boolean) @IsBoolean() hasApplied?: boolean;
  @IsOptional() @IsDateString() activeSince?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) ctcMax?: number;

  @IsOptional() @IsEnum(CandidateSortKey) sort?: CandidateSortKey;
  @IsOptional() @IsIn(['asc', 'desc']) dir?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_PAGE_SIZE) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
  /** Archived applications are hidden by default; this brings them back. */
  @IsOptional() @Type(() => Boolean) @IsBoolean() includeArchived?: boolean;
}

/**
 * A bulk action over a selection of candidates (PRD §15).
 *
 * `expectedCount` is the guard that matters: a filtered list can change between the
 * operator ticking "select all" and this request arriving, and without it a bulk reject
 * can land on a set nobody looked at. Optional in the type, because an API client acting
 * on explicit ids has nothing to confirm — but the UI always sends it.
 */
export class BulkCandidateActionDto {
  @IsEnum(BulkAction) action!: BulkAction;

  @IsArray() @ArrayMaxSize(MAX_BULK_SIZE) @IsUUID('4', { each: true })
  candidateIds!: string[];

  @IsOptional() @IsString() @MaxLength(2000) reason?: string | null;
  @IsOptional() @IsEnum(ApplicationStage) toStage?: ApplicationStage | null;
  @IsOptional() @IsString() @MaxLength(64) roundId?: string | null;
  @IsOptional() @IsUUID() scheduledAssessmentId?: string | null;
  @IsOptional() @IsUUID() ownerUserId?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) expectedCount?: number | null;
}
