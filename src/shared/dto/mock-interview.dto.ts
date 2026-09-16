/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Mock Interview (AI-powered, text-based; fullscreen-proctored, no camera). A dynamic
 * interview: the AI asks one question at a time, adapts to answers, then evaluates the
 * transcript. The client runs it behind InterviewProctorGate - a fullscreen gate that
 * counts tab switches and fullscreen exits. There is no webcam anywhere in the flow.
 */
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type InterviewDifficulty = 'Easy' | 'Medium' | 'Hard';
export type InterviewTypeValue = 'technical' | 'behavioral' | 'mixed';

export const INTERVIEW_DIFFICULTIES: InterviewDifficulty[] = ['Easy', 'Medium', 'Hard'];
export const INTERVIEW_TYPES: InterviewTypeValue[] = ['technical', 'behavioral', 'mixed'];
export const INTERVIEW_DURATIONS = [5, 7, 10, 15, 20];

export class CreateMockInterviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  topic!: string;

  @IsOptional()
  @IsIn(INTERVIEW_DIFFICULTIES)
  difficulty?: InterviewDifficulty;

  @IsOptional()
  @IsIn(INTERVIEW_TYPES)
  interviewType?: InterviewTypeValue;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  durationMinutes?: number;
}

export class NextQuestionDto {
  @IsInt()
  previousQuestionId!: number;

  @IsString()
  @MaxLength(8000)
  answer!: string;
}

export class SubmitInterviewResponseDto {
  @IsInt()
  questionId!: number;

  @IsString()
  @MaxLength(8000)
  answer!: string;
}

export class SubmitInterviewDto {
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SubmitInterviewResponseDto)
  responses!: SubmitInterviewResponseDto[];
}

// ─── Read shapes ─────────────────────────────────────────────────────────────

export interface InterviewQuestionDto {
  id: number;
  question_text: string;
  type: string;
  is_final_question: boolean;
}

export interface InterviewQuestionScoreDto {
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

/** Which grader produced an evaluation: 'ai' is the rubric-anchored LLM grade (the only
 *  one that can carry communication / confidence), 'heuristic' is the length-based
 *  fallback used when every AI attempt failed. Absent on rows graded before the marker
 *  shipped. Never render this verbatim to a learner. */
export type InterviewGradedByDto = 'ai' | 'heuristic';

export interface InterviewEvaluationDto {
  overall_percentage: number;
  overall_feedback: string;
  strengths: string[];
  areas_for_improvement: string[];
  question_scores: Record<string, InterviewQuestionScoreDto>;
  /** 0-100 sub-scores, present only on an AI grade. */
  communication_score?: number;
  confidence_score?: number;
  graded_by?: InterviewGradedByDto;
  /** ISO-8601 instant the evaluation was produced. */
  graded_at?: string;
}

/** Result of POST /admin/mock-interviews/:id/regrade. Idempotent: an interview the AI
 *  has already graded comes back untouched with regraded=false. */
export interface MockInterviewRegradeResultDto {
  id: string;
  regraded: boolean;
  /** Why nothing was written; null when regraded=true. */
  reason: 'already-ai-graded' | 'regrade-failed' | null;
  gradedBy: InterviewGradedByDto | null;
  overallPercentage: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
}

export interface MockInterviewSummaryDto {
  id: string;
  topic: string;
  difficulty: string;
  interviewType: string;
  durationMinutes: number;
  status: string;
  overallPercentage: number | null;
  createdAt: string;
  submittedAt: string | null;
}

export interface MockInterviewDetailDto extends MockInterviewSummaryDto {
  maxTurns: number;
  turnNumber: number;
  currentQuestion: InterviewQuestionDto | null;
  questions: InterviewQuestionDto[];
  transcript: { responses: Array<{ question_id: number; question_text: string; answer: string; answered_at: string }> };
  evaluation: InterviewEvaluationDto | null;
  startedAt: string | null;
}

/** Returned by start / next-question. */
export interface InterviewTurnDto {
  question: InterviewQuestionDto | null;
  isFinal: boolean;
  turnNumber: number;
  maxTurns: number;
  status: string;
}
