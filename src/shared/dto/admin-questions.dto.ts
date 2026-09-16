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
  /**
   * Taxonomy BY NAME — the CSV's own Section / Topic / Subtopic columns. The server
   * resolves these case-insensitively and PARENT-SCOPED, creating whatever is missing
   * with a server-generated slug, and reports where each row landed in
   * `resolvedSection` / `resolvedTopic` / `resolvedSubtopic`. A blank field falls back
   * to the request-level `defaultSectionName` / `defaultTopicName` / `defaultSubtopicName`.
   *
   * This replaced client-built slugs: the wizard used to invent `section--topic--subtopic`
   * itself, which could exceed the 120-char slug limit (400ing the whole batch) and, worse,
   * silently reused an unrelated existing node whenever its guessed slug happened to exist.
   */
  @IsOptional() @IsString() @MaxLength(160) sectionName?: string;
  @IsOptional() @IsString() @MaxLength(160) topicName?: string;
  @IsOptional() @IsString() @MaxLength(160) subtopicName?: string;
  /** LEGACY escape hatch: an exact existing slug. Wins over the name fields when set. */
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
  /** Section / Topic / Subtopic NAMES applied to every row that leaves its own blank —
   *  the wizard's "map the whole file to one place" control. */
  @IsOptional() @IsString() @MaxLength(160) defaultSectionName?: string;
  @IsOptional() @IsString() @MaxLength(160) defaultTopicName?: string;
  @IsOptional() @IsString() @MaxLength(160) defaultSubtopicName?: string;
  /**
   * OPT-IN to importing questions with NO topic at all. Off by default: an unfiled
   * question is invisible in every topic picker and shows a dash in the bank, which is
   * exactly the bug this flag guards — rows that resolve to nothing are reported
   * INVALID (`field: 'subtopic'`) instead of being imported as orphans.
   */
  @IsOptional() @IsBoolean() allowUnfiled?: boolean;
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
/** Where one level of a row's taxonomy resolved to. `slug` is null on a dry run for a
 *  node that does not exist yet (`isNew`) — the server only mints a slug when it writes. */
export interface AdminBulkUploadResolvedNodeDto {
  name: string;
  slug: string | null;
  /** True when the import will CREATE this node rather than reuse an existing one. */
  isNew: boolean;
}

export interface AdminBulkUploadRowResult {
  index: number;
  code: string | null;
  status: 'valid' | 'invalid' | 'created' | 'skipped';
  errors: AdminBulkUploadFieldError[];
  /** Where this row will be (or was) filed — so Map & Review can show it per row
   *  instead of the admin discovering a dash in the bank afterwards. Null at a level
   *  the row does not use (e.g. no subtopic), and on a row with no taxonomy at all. */
  resolvedSection?: AdminBulkUploadResolvedNodeDto | null;
  resolvedTopic?: AdminBulkUploadResolvedNodeDto | null;
  resolvedSubtopic?: AdminBulkUploadResolvedNodeDto | null;
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
    /** Rows that resolve to NO topic (blocked unless `allowUnfiled`). */
    unfiled: number;
  };
  rows: AdminBulkUploadRowResult[];
}

/** A node in the Section → Topic → Subtopic taxonomy tree
 *  (GET /admin/questions/topics/tree) — powers the bulk-upload mapping pickers. */
export interface AdminTopicNodeDto {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  orderIndex: number;
  /** 0 = Section, 1 = Topic, 2 = Subtopic. */
  depth: number;
  /** Questions filed DIRECTLY on this node, any status. */
  questionCount: number;
  /** Questions filed on this node or anything below it, any status. */
  subtreeQuestionCount: number;
  /**
   * A machine-generated scratch root the pickers hide by default: the `*-ai` roots left
   * by an old generation run (a stray one literally named "strings") and
   * `ai-practice-topics`. Classified on the SERVER so both repos agree, and inherited by
   * every descendant.
   */
  hidden: boolean;
  children: AdminTopicNodeDto[];
}

/** Retag many questions' difficulty at once (admin review/cleanup of mis-tagged items). */
export class AdminBulkDifficultyDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
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
  @IsUUID('all', { each: true })
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

/**
 * Most ids a selection browser may pass as the `excludeIds` QUERY param (already-selected
 * items) on GET /admin/questions and GET /admin/coding/problems/search. Kept at 300 so the
 * request line stays inside Node's 16 KB header limit: 300 uuids comma-separated and
 * URL-encoded (%2C) are ~11.7 KB, leaving room for the other params and headers. Use the
 * comma-separated form (a repeated `?excludeIds=` per id is ~40% longer). The POST
 * /admin/assessment-builder/sample BODY is not bound by this and keeps a 500 cap.
 */
export const MAX_EXCLUDE_IDS = 300;

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

// ─── Section / Topic / Subtopic taxonomy admin ───────────────────────────────
//
// `assessments.topics` is self-referential: a ROOT is a Section, its child a Topic,
// its grandchild a Subtopic. `questions.subtopic_id` points at whichever level the
// author picked, so all three are "filable". Nothing in the database has a FOREIGN
// KEY into this table — every reference is either a loose uuid (questions.subtopic_id)
// or a loose SLUG (study material, adaptive sessions, study-plan days, billing scope
// refs). A naive DELETE therefore always succeeds and silently orphans them, which is
// why the delete guard below re-checks every one of those references inside the same
// statement (see scripts/cleanup-ai-topics.ts, the proven reference implementation).

/**
 * Stable `error.code` values for taxonomy admin.
 *   TOPIC_NAME_TAKEN   409 — a sibling under the same parent already has this name
 *                            (compared case-insensitively).
 *   TOPIC_TOO_DEEP     400 — the taxonomy is exactly three levels
 *                            (Section → Topic → Subtopic); a 4th has nowhere to go.
 *   TOPIC_CYCLE        400 — re-parenting a node into its own subtree.
 *   TOPIC_IN_USE       409 — something still references the node (or, with
 *                            ?cascade=true, something in its subtree). `details`
 *                            carries the full usage breakdown.
 */
export const TOPIC_ADMIN_ERRORS = {
  TOPIC_NAME_TAKEN: 'TOPIC_NAME_TAKEN',
  TOPIC_TOO_DEEP: 'TOPIC_TOO_DEEP',
  TOPIC_CYCLE: 'TOPIC_CYCLE',
  TOPIC_IN_USE: 'TOPIC_IN_USE',
} as const;

/** The taxonomy is exactly three levels: 0 = Section, 1 = Topic, 2 = Subtopic. */
export const MAX_TOPIC_DEPTH = 2;
/** `assessments.topics.slug` is varchar(120) UNIQUE — the server never emits a longer one. */
export const TOPIC_SLUG_MAX_LENGTH = 120;
/** `assessments.topics.name` is varchar(160). */
export const TOPIC_NAME_MAX_LENGTH = 160;

/** Body for POST /admin/questions/topics. The SLUG IS SERVER-GENERATED — callers send a
 *  display name only, so no client can invent a colliding or over-long slug. */
export class AdminCreateTopicDto {
  @IsString()
  @MinLength(2)
  @MaxLength(TOPIC_NAME_MAX_LENGTH)
  name!: string;

  /** Parent node id. Omit / null for a new Section (root). */
  @IsOptional()
  @IsUUID('all')
  parentId?: string | null;

  /** Sort position among its siblings. Defaults to "after the last sibling". */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  orderIndex?: number;
}

/** Body for PATCH /admin/questions/topics/:id. Every field is optional; an absent field
 *  is untouched. A RENAME NEVER CHANGES THE SLUG — study material, adaptive sessions,
 *  study-plan days and billing scope refs all point at the slug as a string, so mutating
 *  it would silently detach them. */
export class AdminUpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(TOPIC_NAME_MAX_LENGTH)
  name?: string;

  /** Move the node under a different parent; null promotes it to a root Section. */
  @IsOptional()
  @IsUUID('all')
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  orderIndex?: number;
}

/** One taxonomy node as the admin console sees it. */
export interface AdminTopicDetailDto {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  orderIndex: number;
  /** 0 = Section, 1 = Topic, 2 = Subtopic. */
  depth: number;
}

/** Reference counts for ONE topic — every logical reference into `assessments.topics`,
 *  grouped by the table that holds it. Non-zero anywhere ⇒ the node can't be deleted. */
export interface AdminTopicUsageCounts {
  /** Child topics directly under this node. */
  childTopics: number;
  /** `assessments.questions.subtopic_id` — ANY status, drafts and archived included. */
  questions: number;
  /** `catalog.study_material_items.quiz_topic_slug`. */
  studyMaterialItems: number;
  /** `assessments.adaptive_sessions.topic_slug`. */
  adaptiveSessions: number;
  /** `assessments.study_plan_days.focus_topic_slug`. */
  studyPlanDays: number;
  /** `billing.entitlements.scope_ref`. */
  entitlements: number;
  /** `billing.payment_orders.scope_ref`. */
  paymentOrders: number;
  /** `billing.payment_order_items.scope_ref`. */
  paymentOrderItems: number;
  /** `billing.coupons.applicability` jsonb `scopeRef`. */
  coupons: number;
  /** Sum of everything above EXCEPT `childTopics` (which a cascade delete removes itself). */
  externalTotal: number;
}

/** GET /admin/questions/topics/:id/usage — exactly what would block a delete. */
export interface AdminTopicUsageDto {
  id: string;
  slug: string;
  name: string;
  depth: number;
  /** Every node in the subtree INCLUDING this one. */
  subtreeSize: number;
  /** References to this node alone. */
  self: AdminTopicUsageCounts;
  /** References to this node and every descendant (what ?cascade=true has to clear). */
  subtree: AdminTopicUsageCounts;
  /** DELETE without cascade will succeed: no children and nothing points at it. */
  deletable: boolean;
  /** DELETE ?cascade=true will succeed: nothing outside the subtree points into it. */
  cascadeDeletable: boolean;
}

// ─── Bulk status / bulk delete on the question list ──────────────────────────

/** Most ids one bulk-delete call may carry. A hard delete fans out across six tables
 *  inside a single transaction, so the batch is kept small enough to stay short-lived. */
export const MAX_BULK_DELETE_IDS = 200;

/** Body for PATCH /admin/questions/bulk-status — publish / unpublish / archive / restore
 *  many questions at once. */
export class AdminBulkStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsEnum(QuestionStatus)
  status!: QuestionStatus;
}

export interface AdminBulkStatusResultDto {
  updated: number;
  /** Ids that matched no question (already deleted elsewhere). */
  notFound: string[];
}

/** Body for POST /admin/questions/bulk-delete — PERMANENT removal. */
export class AdminBulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_BULK_DELETE_IDS)
  @IsUUID('all', { each: true })
  ids!: string[];
}

/** Why one id in a bulk delete was refused. `QUESTION_IN_USE` reuses the existing
 *  selection-error code (assessment-builder.dto.ts). */
export interface AdminBulkDeleteRefusalDto {
  id: string;
  code: 'QUESTION_IN_USE' | 'QUESTION_NOT_FOUND';
  reason: string;
  /** Rows in `assessments.mock_test_questions` (the question sits in a mock). */
  mockLinks?: number;
  /** Rows in `assessments.mock_attempt_answers` (a student answered it in an assessment). */
  recordedAnswers?: number;
  /** Rows in `assessments.practice_attempts` (a student practised it). */
  practiceAttempts?: number;
}

/** POST /admin/questions/bulk-delete is PARTIAL: the clean ids are deleted and the rest
 *  come back in `refused` with the counts that blocked them. Never all-or-nothing. */
export interface AdminBulkDeleteResultDto {
  deleted: string[];
  refused: AdminBulkDeleteRefusalDto[];
}
