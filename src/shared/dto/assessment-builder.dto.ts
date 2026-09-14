/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at frontend-repo/src/shared/dto/assessment-builder.dto.ts.
 *
 * AI-assisted assessment builder: the admin gives a topic + count + type; the
 * platform sources matching questions from the bank and generates the shortfall
 * with AI (live), then schedules a company drive with an explicit window.
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export type AssessmentItemType = 'MCQ' | 'CODING';

/** A difficulty band for bank sampling. 'MIXED' = every band. */
export type SampleDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
export const SAMPLE_DIFFICULTIES: SampleDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'MIXED'];

/**
 * Stable `error.code` values for question selection (create / append / freeze guards).
 *   INVALID_QUESTION_IDS   400 — ids that don't exist / aren't usable; `details` lists
 *                                them by reason (flat string arrays, only non-empty keys).
 *   DUPLICATE_QUESTION_IDS 400 — the same id picked twice (or already in the assessment).
 *   QUESTION_SET_LOCKED    409 — the drive's mock already has attempts.
 *   CODING_PROBLEM_IN_USE  409 — a coding problem linked to a mock can't be deleted.
 *   QUESTION_IN_USE        409 — options of a question in an attempted mock can't be replaced.
 */
export const QUESTION_SELECTION_ERRORS = {
  INVALID_QUESTION_IDS: 'INVALID_QUESTION_IDS',
  DUPLICATE_QUESTION_IDS: 'DUPLICATE_QUESTION_IDS',
  QUESTION_SET_LOCKED: 'QUESTION_SET_LOCKED',
  CODING_PROBLEM_IN_USE: 'CODING_PROBLEM_IN_USE',
  QUESTION_IN_USE: 'QUESTION_IN_USE',
} as const;

/** `details` of a 400 INVALID_QUESTION_IDS — the offending ids grouped by reason. */
export interface InvalidQuestionIdsDetails {
  /** MCQ ids that don't exist. */
  questionNotFound?: string[];
  /** MCQ ids that exist but aren't PUBLISHED (draft / archived). */
  questionNotPublished?: string[];
  /** MCQ ids of a type a mock can't grade (only MCQ + MULTI_SELECT are allowed). */
  questionUnsupportedType?: string[];
  /** Coding-problem ids that don't exist. */
  codingNotFound?: string[];
  /** Coding-problem ids that exist but are deactivated. */
  codingInactive?: string[];
}

/** `details` of a 400 DUPLICATE_QUESTION_IDS. */
export interface DuplicateQuestionIdsDetails {
  duplicateQuestionIds?: string[];
  duplicateCodingProblemIds?: string[];
  /** Append only: ids the assessment already contains. */
  questionIdsAlreadyInAssessment?: string[];
  codingProblemIdsAlreadyInAssessment?: string[];
}

/** A built section: concrete question / coding-problem ids resolved by the wizard. */
export class BuilderSectionDto {
  @IsString() @MaxLength(120) name!: string;

  /** Resolved MCQ question ids (from bank + AI-generated). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  questionIds?: string[];

  /** Resolved coding problem ids (from bank + AI-generated). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  codingProblemIds?: string[];

  /** Legacy: pick by topic at create-time (still supported). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsUUID('all', { each: true })
  topicIds?: string[];

  @IsOptional() @IsInt() @Min(1) @Max(100) numQuestions?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) marksPerQuestion?: number;
  @IsOptional() @IsInt() @Min(1) @Max(300) durationMinutes?: number;
}

export class PreviewAssessmentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BuilderSectionDto)
  sections!: BuilderSectionDto[];
}

export class CreateAssessmentDto {
  /** Owning company, or omitted for a platform-wide assessment (all students). */
  @IsOptional() @IsUUID() companyId?: string;
  /** Restrict the assessment to one college (all its cohorts) — cohort-wise scope. */
  @IsOptional() @IsUUID() collegeId?: string;
  /** Restrict the assessment to a single cohort/batch (implies its college). */
  @IsOptional() @IsUUID() cohortId?: string;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;

  /** Free-form description shown on the instructions screen + assignment email. */
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  /** Candidate-facing instructions shown on the pre-assessment screen. */
  @IsOptional() @IsString() @MaxLength(2000) instructions?: string;

  /** Window start. */
  @IsISO8601() scheduledAt!: string;
  /** Window end (enforced mandatory by the wizard UI). */
  @IsOptional() @IsISO8601() endsAt?: string;
  /** Per-attempt timer in minutes (enforced mandatory by the wizard UI). */
  @IsOptional() @IsInt() @Min(5) @Max(600) durationMinutes?: number;

  @IsOptional() @IsBoolean() proctored?: boolean;
  @IsOptional() @IsBoolean() proctorAutoSubmit?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(10) proctorMaxWarnings?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  /** Per-assessment lock toggles, threaded onto the built mock. Omitted ⇒ entity
   *  defaults (subscription ON, profile OFF) — unchanged behaviour. */
  @IsOptional() @IsBoolean() subscriptionLockEnabled?: boolean;
  @IsOptional() @IsBoolean() profileLockEnabled?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BuilderSectionDto)
  sections!: BuilderSectionDto[];
}

/** Complete edit of an existing assessment (only allowed before any submissions). */
export class EditAssessmentDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  /** Free-form description shown on the instructions screen + assignment email. */
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  /** Candidate-facing instructions shown on the pre-assessment screen. */
  @IsOptional() @IsString() @MaxLength(2000) instructions?: string;
  /** Set to change owner; pass null/omit handling on the FE. '' is treated as platform. */
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsBoolean() platform?: boolean;
  @IsOptional() @IsISO8601() scheduledAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsOptional() @IsInt() @Min(5) @Max(600) durationMinutes?: number;
  @IsOptional() @IsBoolean() proctored?: boolean;
  @IsOptional() @IsBoolean() proctorAutoSubmit?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(10) proctorMaxWarnings?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) passingScore?: number;
  @IsOptional() @IsBoolean() subscriptionLockEnabled?: boolean;
  @IsOptional() @IsBoolean() profileLockEnabled?: boolean;
  /** New sections to APPEND to the question set (bank + AI-generated ids). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BuilderSectionDto)
  addSections?: BuilderSectionDto[];
}

/** Resolve a topic + how many questions of a type are needed. Prefer `topicId`
 *  (from the section/topic picker) — it samples the whole subtree from the bank
 *  reliably. `topic` (free-text) is the legacy fallback. */
export class SourceTopicDto {
  /** Selected taxonomy topic/section id (samples its whole subtree from the bank). */
  @IsOptional() @IsUUID() topicId?: string;
  @IsString() @MinLength(2) @MaxLength(120) topic!: string;
  @IsIn(['MCQ', 'CODING']) type!: AssessmentItemType;
  @IsInt() @Min(1) @Max(50) count!: number;
  /** Restrict the bank sample to this difficulty (matches the UI selector). Applies to MCQ
   *  and "Whole Coding Section"; a CODING topic uses `codingDifficulty` instead. */
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  /** "Whole Coding Section" - sample randomly across the entire active coding bank. */
  @IsOptional() @IsBoolean() allCoding?: boolean;
  /** CODING only: restrict the bank sample to one band ('MIXED' = every band). Omitted = the
   *  original behaviour: a coding topic is never narrowed (`difficulty` never applied to
   *  it) and "Whole Coding Section" keeps using `difficulty`. When sent, it wins for both. */
  @IsOptional() @IsIn(SAMPLE_DIFFICULTIES) codingDifficulty?: SampleDifficulty;
}

/**
 * RANDOM selection mode — sample `count` bank items for the admin to REVIEW before
 * they are added to a section (nothing is persisted, no topic is ever created).
 *   MCQ:    `topicId` (optional) scopes to that section/topic's whole subtree.
 *   CODING: exactly one of `codingTopic` (the exact primary tag, tags[0]) or
 *           `allCoding: true` (the whole eligible coding bank).
 * `companySlug` narrows either pool to that company's tagged items; `excludeIds` keeps
 * already-selected items out so a re-roll never returns a duplicate.
 */
export class SampleQuestionsDto {
  @IsIn(['MCQ', 'CODING']) type!: AssessmentItemType;
  /** MCQ only: section/topic id — its whole subtree is sampled. Omit = whole MCQ bank. */
  @IsOptional() @IsUUID() topicId?: string;
  /** CODING only: the exact primary coding tag (as listed by /coding-topics). */
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) codingTopic?: string;
  /** CODING only: sample across the whole eligible coding bank. */
  @IsOptional() @IsBoolean() allCoding?: boolean;
  @IsIn(SAMPLE_DIFFICULTIES) difficulty!: SampleDifficulty;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) companySlug?: string;
  @IsInt() @Min(1) @Max(50) count!: number;
  /** Ids already selected (MCQ or coding) — never returned. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  excludeIds?: string[];
}

export interface SampledQuestionItem {
  id: string;
  /** MCQ stem / coding title. */
  label: string;
  difficulty: string;
  type: AssessmentItemType;
}

export interface SampleQuestionsResult {
  items: SampledQuestionItem[];
  /** `count` as asked. */
  requested: number;
  /** Eligible items in the pool after exclusions (so the UI can say "only N available"). */
  available: number;
  /** items.length — min(requested, available). */
  returned: number;
}

/** Per-section breakdown of what POST /create actually persisted. */
export interface CreatedAssessmentSection {
  name: string;
  mcqCount: number;
  codingCount: number;
  marksPerQuestion: number;
  totalMarks: number;
}

/** POST /create response. The first six fields are the original contract. */
export interface CreatedAssessmentResult {
  mockTestId: string;
  scheduledAssessmentId: string;
  totalQuestions: number;
  mcqCount: number;
  codingCount: number;
  companyName: string;
  /** Sum of every linked item's marks. */
  totalMarks: number;
  sections: CreatedAssessmentSection[];
}

/** Generate ONE AI item for a resolved topic (called in a loop for the live modal). */
export class GenerateOneDto {
  /** Required for MCQ (the generated question is filed under it). Coding generation is
   *  keyed by `topicName` alone — a coding topic is a tag, not a taxonomy row — so it is
   *  not validated for CODING (the /source response carries '' there). */
  @ValidateIf((o: GenerateOneDto) => o.type === 'MCQ')
  @IsUUID('all')
  topicId!: string;
  @IsString() @MaxLength(120) topicName!: string;
  @IsIn(['MCQ', 'CODING']) type!: AssessmentItemType;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  /** Stems/titles already chosen — so the model avoids duplicates. */
  @IsOptional() @IsArray() @ArrayMaxSize(60) @IsString({ each: true }) avoid?: string[];
}
