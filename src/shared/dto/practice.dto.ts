/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/practice.dto.ts.
 */
import { z } from 'zod';

/**
 * Submit a practice attempt. The client never tells us `isCorrect` — the
 * server grades. `selectedOptionIds` is an array (MULTI_SELECT support).
 * `clientAttemptId` enables idempotent retries (DB unique constraint).
 */
export const practiceSubmitSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()).max(10).default([]),
  answerText: z.string().max(2000).optional(),
  timeTakenSec: z.number().int().min(0).max(7200),
  usedHint: z.boolean().default(false),
  clientAttemptId: z.string().min(8).max(80).optional(),
});

export type PracticeSubmitDto = z.infer<typeof practiceSubmitSchema>;
