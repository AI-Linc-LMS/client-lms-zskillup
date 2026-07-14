/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/admin-questions.dto.ts.
 *
 * Sprint 3 — Superadmin question-bank CRUD.
 *
 * The service layer enforces shape rules that don't belong in field-level
 * validation: at least 2 options, at least 1 correct option for MCQ /
 * MULTI_SELECT types; NUMERIC + CODING types must have an empty options array.
 * (Those checks live in `AdminQuestionsService` and stay there — they need
 * access to the `type` discriminant across multiple fields.)
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '../enums';

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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topicSlug!: string;

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

/** Patch — all fields optional; supplying `options` replaces the whole set. */
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
  hint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topicSlug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  companySlug?: string | null;

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

/**
 * Bulk question import (Sprint 3 — superadmin). The admin pastes / uploads a CSV
 * with a header row. Columns (case-insensitive, order-independent):
 *
 *   stem, type, difficulty, topic, company, hint, explanation,
 *   optionA, optionB, optionC, optionD, correct
 *
 *   - type        MCQ | MULTI_SELECT   (default MCQ)
 *   - difficulty  EASY | MEDIUM | HARD (default MEDIUM)
 *   - topic       topic slug           (required)
 *   - company     company slug         (optional)
 *   - optionA..D  option text          (≥2 for choice questions)
 *   - correct     correct letter(s)    e.g. "B" or "A,C"
 *
 * Imported questions are PUBLISHED so they are immediately usable in practice /
 * mocks. The server parses the CSV and reports a per-row outcome.
 */
export class AdminImportQuestionsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  csv!: string;
}
