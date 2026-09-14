/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored at frontend-repo/src/shared/dto/admin-coding-search.dto.ts.
 *
 * MANUAL question selection for coding rounds (assessment builder): browse/search the
 * coding bank and preview the picked problems before publishing. Admin + Super Admin.
 *
 *   GET  /admin/coding/problems/search   — paginated summaries (AdminCodingSearchQueryDto)
 *   POST /admin/coding/problems/preview  — statement + visible examples for picked ids
 *
 * Neither ever returns test cases beyond the visible (sample) examples, hidden tests,
 * expected outputs of hidden tests, or reference solutions.
 */
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_EXCLUDE_IDS } from './admin-questions.dto';

/** 'true' / 'false' query strings → booleans (anything else is left for @IsBoolean to
 *  reject). Reads the RAW value: implicit conversion would turn 'false' into true. */
const queryBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }): unknown => {
  const v = obj[key];
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return v;
};

/** `a,b` or repeated `?k=a&k=b` → a trimmed, lower-cased id array. */
const queryIdList = ({ obj, key }: { obj: Record<string, unknown>; key: string }): unknown => {
  const v = obj[key];
  if (v === undefined || v === null) return v;
  return (Array.isArray(v) ? v : [v])
    .flatMap((x) => String(x).split(','))
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
};

export class AdminCodingSearchQueryDto {
  /** Exact primary coding topic (tags[0]). */
  @IsOptional() @IsString() @MaxLength(80) topic?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  /** Company slug the problem is tagged to. */
  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @Transform(queryBool) @IsBoolean() verified?: boolean;
  /** Defaults to true (active problems only); pass false to browse deactivated ones. */
  @IsOptional() @Transform(queryBool) @IsBoolean() active?: boolean;
  /** Case-insensitive title substring. */
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  /** Ids to leave out (already selected), comma-separated (preferred) or repeated,
   *  ≤ MAX_EXCLUDE_IDS (300) — see admin-questions.dto. */
  @IsOptional()
  @Transform(queryIdList)
  @IsArray()
  @ArrayMaxSize(MAX_EXCLUDE_IDS, { message: `excludeIds accepts at most ${MAX_EXCLUDE_IDS} ids` })
  @IsUUID('all', { each: true })
  excludeIds?: string[];
  /** Page size, 1-100 (default 25). */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

/** One coding problem in a selection list — metadata only. */
export interface AdminCodingProblemSummaryDto {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  /** Primary coding topic (tags[0]); null when untagged. */
  topic: string | null;
  tags: string[];
  /** Company slugs. */
  companies: string[];
  isActive: boolean;
  verified: boolean;
  source: string | null;
}

export interface AdminCodingSearchResultDto {
  rows: AdminCodingProblemSummaryDto[];
  /** Matches across all pages. */
  total: number;
}

export class AdminPreviewCodingProblemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  ids!: string[];
}

/** A sample (visible) test case — exactly what a student sees on the problem page. */
export interface AdminCodingExampleDto {
  input: string;
  expectedOutput: string;
}

export interface AdminCodingProblemPreviewDto extends AdminCodingProblemSummaryDto {
  statement: string;
  inputFormat: string | null;
  outputFormat: string | null;
  constraints: string | null;
  sampleInput: string | null;
  sampleOutput: string | null;
  /** Visible examples only (test cases flagged isSample), in stored order. */
  examples: AdminCodingExampleDto[];
}

export interface AdminCodingPreviewResultDto {
  /** In request order; unknown ids are skipped (and listed in missingIds). */
  items: AdminCodingProblemPreviewDto[];
  missingIds: string[];
}
