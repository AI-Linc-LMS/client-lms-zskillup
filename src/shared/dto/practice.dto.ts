/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011, amended 2026-06-03).
 * Mirrored at frontend-repo/src/shared/dto/practice.dto.ts.
 *
 * Submit a practice attempt. The client never tells us `isCorrect` — the
 * server grades. `selectedOptionIds` is an array (MULTI_SELECT support).
 * `clientAttemptId` enables idempotent retries (DB unique constraint).
 */
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class PracticeSubmitDto {
  @IsUUID()
  questionId!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  selectedOptionIds: string[] = [];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answerText?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7200)
  timeTakenSec!: number;

  @IsBoolean()
  usedHint: boolean = false;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  clientAttemptId?: string;
}
