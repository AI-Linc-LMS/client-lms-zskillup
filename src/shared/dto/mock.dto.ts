/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/mock.dto.ts.
 *
 * Mock-test engine request DTOs (Sprint 4). Answers are recorded mid-attempt;
 * grading, scoring, and percentile happen server-side at submit (the client
 * never receives `isCorrect` on a question during the attempt).
 */
import { ArrayMaxSize, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class MockAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  selectedOptionIds: string[] = [];
}

/** Submit a coding solution for a CODING problem within a mock attempt. */
export class SubmitMockCodeDto {
  @IsUUID()
  problemId!: string;

  @IsString()
  language!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60000)
  source!: string;
}
