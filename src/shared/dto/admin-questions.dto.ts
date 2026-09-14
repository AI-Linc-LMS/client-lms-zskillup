/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at frontend-repo/src/shared/dto/admin-questions.dto.ts.
 *
 * Company mapping is intentionally NOT part of create/update — it is managed
 * via dedicated endpoints (POST/DELETE /admin/questions/:id/companies) so that
 * the store-once, map-many principle stays explicit (Framework §Company Mapping).
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CompanyImportance,
  ContentUsageType,
  QuestionDifficulty,
  QuestionFrequency,
  QuestionSource,
  QuestionStatus,
  QuestionType,
} from '../enums';

export class AdminQuestionOptionInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  orderIndex?: number;
}

export class AdminCreateQuestionDto {
  /**
   * e.g. NUM-PER-001. OPTIONAL: the console's "add a question" form has no code
   * field, and asking an author to invent a unique one by hand is a trap - so
   * when it is omitted the server derives the next free code from the question's
   * subtopic. Bulk ingest still supplies its own.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,6}-[A-Z]{2,6}-\d{3,5}$/, {
    message: 'code must follow the format SECTION-TOPIC-NNN (e.g. NUM-PER-001)',
  })
  code?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  stem!: string;

  /** Optional diagram/figure shown with the stem — a URL or a compressed data-URL
   *  (for Data-Interpretation charts / Venn diagrams). */
  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  imageUrl?: string;

  /** Correct answer text — required for NUMERIC/CODING, omit for MCQ. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  solution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hint?: string;

  /** Subtopic slug — the leaf level in Section → Topic → Subtopic. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subtopicSlug?: string;

  @IsOptional()
  @IsEnum(QuestionFrequency)
  frequency?: QuestionFrequency;

  @IsOptional()
  @IsEnum(QuestionSource)
  source?: QuestionSource;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(2000, { each: true })
  @Max(2100, { each: true })
  yearTags?: number[];

  /** Target roles this question is relevant for (free-form labels). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  roleTags?: string[];

  /** Citation / source URL (for genuinely-sourced PYQ / memory-based questions). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceRef?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  /** Tag the question to a company hub on creation (same effect as the separate
   *  company-tag endpoint). The console's form offers this, so create accepts it. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  companySlug?: string;

  @IsEnum(QuestionStatus)
  status: QuestionStatus = QuestionStatus.DRAFT;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AdminQuestionOptionInputDto)
  options: AdminQuestionOptionInputDto[] = [];
}

export class AdminUpdateQuestionDto {
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  stem?: string;

  /** Set/replace the diagram; send '' to clear it. */
  @IsOptional()
  @IsString()
  @MaxLength(3_000_000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  solution?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hint?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  subtopicSlug?: string | null;

  @IsOptional()
  @IsEnum(QuestionFrequency)
  frequency?: QuestionFrequency | null;

  @IsOptional()
  @IsEnum(QuestionSource)
  source?: QuestionSource | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  yearTags?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  roleTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceRef?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AdminQuestionOptionInputDto)
  options?: AdminQuestionOptionInputDto[];
}

/** Body for POST /admin/questions/:id/companies */
export class AdminQuestionCompanyTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  companySlug!: string;

  @IsEnum(CompanyImportance)
  importance!: CompanyImportance;
}

/** Body for POST /admin/questions/:id/usage */
export class AdminQuestionContentUsageDto {
  @IsArray()
  @IsEnum(ContentUsageType, { each: true })
  usageTypes!: ContentUsageType[];
}

// ─── Bulk ingest (POST /admin/questions/bulk) ───────────────────────────────

/** A topic the bulk payload needs to exist before its questions can FK to it. */
export class AdminBulkEnsureTopicDto {
  @IsString() @MaxLength(120) slug!: string;
  @IsString() @MaxLength(160) name!: string;
  /** Parent topic slug (Section → Topic → Subtopic). Omit for a root section. */
  @IsOptional() @IsString() @MaxLength(120) parentSlug?: string;
}

/** One question in a bulk payload — same shape as create + optional per-item
 *  company importance (else the payload default is used). */
export class AdminBulkQuestionItemDto extends AdminCreateQuestionDto {
  /**
   * Bulk ingest is IDEMPOTENT BY CODE — re-running a batch skips codes that
   * already exist — so a code is mandatory here even though single-question
   * creation now derives one. Re-declared to override the optional base field.
   */
  @IsString()
  @Matches(/^[A-Z]{2,6}-[A-Z]{2,6}-\d{3,5}$/, {
    message: 'code must follow the format SECTION-TOPIC-NNN (e.g. NUM-PER-001)',
  })
  declare code: string;

  @IsOptional()
  @IsEnum(CompanyImportance)
  importance?: CompanyImportance;
}

/** Bulk-ingest a batch of questions for ONE company. Idempotent by `code`
 *  (existing codes are skipped, not overwritten). Topics in `ensureTopics` are
 *  upserted first so each item's `subtopicSlug` resolves. */
export class AdminBulkQuestionsDto {
  @IsString() @MinLength(2) @MaxLength(80) companySlug!: string;

  @IsOptional()
  @IsEnum(CompanyImportance)
  defaultImportance?: CompanyImportance;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AdminBulkEnsureTopicDto)
  ensureTopics?: AdminBulkEnsureTopicDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AdminBulkQuestionItemDto)
  items!: AdminBulkQuestionItemDto[];
}

export interface AdminBulkResultDto {
  created: number;
  skipped: number;
  failed: Array<{ code: string; reason: string }>;
  topicsEnsured: number;
}

// ─── General bulk upload (POST /admin/questions/bulk-upload) ─────────────────
// The admin-UI upload flow: the client parses a CSV/XLSX into rows, calls this with
// dryRun:true to VALIDATE (per-row field errors, no writes), lets the admin fix
// them, then calls with dryRun:false to import. Unlike bulkIngest this is general
// (company optional), auto-derives codes, and creates the Section→Topic→Subtopic
// hierarchy in `ensureTopics` on import. Item fields are LOOSE on purpose — a
// malformed row must return as a per-row error, never a 400 for the whole batch.

export class AdminBulkUploadOptionDto {
  @IsOptional() @IsString() @MaxLength(1000) text?: string;
  @IsOptional() @IsBoolean() isCorrect?: boolean;
}

export class AdminBulkUploadItemDto {
  @IsOptional() @IsString() @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MaxLength(20) type?: string;
  @IsOptional() @IsString() @MaxLength(20) difficulty?: string;
  @IsOptional() @IsString() @MaxLength(4000) stem?: string;
  @IsOptional() @IsString() imageUrl?: string;
  /** Correct answer text — required for NUMERIC / CODING. */
  @IsOptional() @IsString() @MaxLength(2000) answer?: string;
  @IsOptional() @IsString() @MaxLength(4000) hint?: string;
  @IsOptional() @IsString() @MaxLength(8000) explanation?: string;
  @IsOptional() @IsString() @MaxLength(8000) solution?: string;
  /** The leaf topic (subtopic) slug this question maps to; chains up to Topic → Section. */
  @IsOptional() @IsString() @MaxLength(120) subtopicSlug?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AdminBulkUploadOptionDto)
  options?: AdminBulkUploadOptionDto[];
}

export class AdminBulkUploadDto {
  /** true = validate only (per-row errors, no writes); false/omitted = import. */
  @IsOptional() @IsBoolean() dryRun?: boolean;
  /** Optional: also tag every imported question to this company. */
  @IsOptional() @IsString() @MaxLength(80) companySlug?: string;
  @IsOptional() @IsEnum(CompanyImportance) defaultImportance?: CompanyImportance;
  /** Section → Topic → Subtopic nodes to create before import (the service orders
   *  roots before children so `parentSlug` resolves). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AdminBulkEnsureTopicDto)
  ensureTopics?: AdminBulkEnsureTopicDto[];
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => AdminBulkUploadItemDto)
  items!: AdminBulkUploadItemDto[];
}

export interface AdminBulkUploadFieldError {
  field: string;
  message: string;
}
export interface AdminBulkUploadRowResult {
  index: number;
  code: string | null;
  status: 'valid' | 'invalid' | 'created' | 'skipped';
  errors: AdminBulkUploadFieldError[];
}
export interface AdminBulkUploadResultDto {
  dryRun: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    created: number;
    skipped: number;
    topicsCreated: number;
  };
  rows: AdminBulkUploadRowResult[];
}

/** A node in the Section → Topic → Subtopic taxonomy tree
 *  (GET /admin/questions/topics/tree) — powers the bulk-upload mapping pickers. */
export interface AdminTopicNodeDto {
  id: string;
  slug: string;
  name: string;
  children: AdminTopicNodeDto[];
}

/** Retag many questions' difficulty at once (admin review/cleanup of mis-tagged items). */
export class AdminBulkDifficultyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;
}

export interface AdminBulkDifficultyResultDto {
  updated: number;
}

/** Fetch full detail (WITH answers) for a set of question ids — powers the assessment
 *  creation "review questions before publishing" step. */
export class AdminPreviewQuestionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export interface AdminQuestionPreviewOptionDto {
  text: string;
  isCorrect: boolean;
}
export interface AdminQuestionPreviewDto {
  id: string;
  code: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  stem: string;
  /** Free-text answer for NUMERIC/CODING (null for choice questions). */
  answer: string | null;
  options: AdminQuestionPreviewOptionDto[];
}

// ── Manual question selection (assessment builder) ───────────────────────────

/** Most ids a selection browser may pass as `excludeIds` (already-selected items). */
export const MAX_EXCLUDE_IDS = 500;

/**
 * Added to every GET /admin/questions row so a manual picker can show where a question
 * lives and who it's tagged to. `topicName` = the question's own (sub)topic, `sectionName`
 * = the root of that topic's tree (the topic itself when it is a root); both null when the
 * question has no subtopic. `companies` = tagged company slugs, sorted ([] when untagged).
 *
 * GET /admin/questions also accepts (all optional; absent = unchanged behaviour):
 *   type       — MCQ | MULTI_SELECT | NUMERIC | CODING
 *   topicId    — uuid; the topic's WHOLE subtree (unknown id → 404)
 *   excludeIds — ids to leave out, comma-separated or repeated, ≤ MAX_EXCLUDE_IDS
 */
export interface AdminQuestionListRowMeta {
  topicName: string | null;
  sectionName: string | null;
  companies: string[];
}
