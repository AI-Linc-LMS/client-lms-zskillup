/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/mock.dto.ts.
 *
 * Mock-test engine request DTOs (Sprint 4). Answers are recorded mid-attempt;
 * grading, scoring, and percentile happen server-side at submit (the client
 * never receives `isCorrect` on a question during the attempt).
 */
import { SUBJECTIVE_ANSWER_MAX_CHARS } from '../subjective-grading';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Sanity ceiling for a single question's timer: 24h in ms. The real bound is the
 *  attempt's own duration, which the server clamps to — this only rejects nonsense. */
export const MAX_ANSWER_TIME_MS = 24 * 60 * 60 * 1000;

export class MockAnswerDto {
  @IsUUID('loose')
  questionId!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  selectedOptionIds: string[] = [];

  /**
   * CUMULATIVE milliseconds spent on this question so far, not a delta.
   *
   * Cumulative on purpose: the client re-sends an answer on every change and retries on
   * a flaky network, and a delta would double-count each retry. Cumulative makes the
   * write idempotent — the last value simply wins.
   *
   * Client-reported because only the client knows when the question was on screen; the
   * server cannot see focus. The server clamps it to the attempt's own elapsed window so
   * a tampered value cannot exceed the time the attempt was actually open. Optional, so
   * a client that has not shipped the timer yet keeps working and stores NULL
   * ("not recorded") rather than a wrong zero.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ANSWER_TIME_MS)
  timeMs?: number;

  /**
   * Free-text answer for a SUBJECTIVE question. Ignored for every other type, which
   * answer through `selectedOptionIds`.
   *
   * The per-question word limit is enforced on the SERVER as well as counted in the
   * runner, so a client that ignores it cannot post an essay into a 200-word box. The
   * character cap here is the absolute ceiling, independent of any word limit.
   */
  @IsOptional()
  @IsString()
  @MaxLength(SUBJECTIVE_ANSWER_MAX_CHARS)
  textAnswer?: string;
}

/** Submit a coding solution for a CODING problem within a mock attempt. */
export class SubmitMockCodeDto {
  @IsUUID('loose')
  problemId!: string;

  @IsString()
  language!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60000)
  source!: string;

  /** Cumulative ms on this problem. Same contract as `MockAnswerDto.timeMs`. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ANSWER_TIME_MS)
  timeMs?: number;
}
