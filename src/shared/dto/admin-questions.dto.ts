/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/admin-questions.dto.ts.
 */
import { z } from 'zod';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '../enums';

const optionInputSchema = z.object({
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
  orderIndex: z.number().int().min(0).max(20).optional(),
});

/**
 * Create a question (Sprint 3 — Superadmin question-bank CRUD).
 * The server enforces: at least 2 options, at least 1 correct option for MCQ /
 * MULTI_SELECT types. NUMERIC + CODING types must have an empty options array.
 */
export const adminCreateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType),
  difficulty: z.nativeEnum(QuestionDifficulty),
  stem: z.string().min(5).max(5000),
  hint: z.string().max(2000).optional(),
  explanation: z.string().max(5000).optional(),
  topicSlug: z.string().min(2).max(120),
  companySlug: z.string().min(2).max(80).optional(),
  status: z.nativeEnum(QuestionStatus).default(QuestionStatus.DRAFT),
  options: z.array(optionInputSchema).max(10).default([]),
});
export type AdminCreateQuestionDto = z.infer<typeof adminCreateQuestionSchema>;

/** Patch — all fields optional; supplying `options` replaces the whole set. */
export const adminUpdateQuestionSchema = z.object({
  type: z.nativeEnum(QuestionType).optional(),
  difficulty: z.nativeEnum(QuestionDifficulty).optional(),
  stem: z.string().min(5).max(5000).optional(),
  hint: z.string().max(2000).nullable().optional(),
  explanation: z.string().max(5000).nullable().optional(),
  topicSlug: z.string().min(2).max(120).optional(),
  companySlug: z.string().min(2).max(80).nullable().optional(),
  status: z.nativeEnum(QuestionStatus).optional(),
  options: z.array(optionInputSchema).max(10).optional(),
});
export type AdminUpdateQuestionDto = z.infer<typeof adminUpdateQuestionSchema>;
