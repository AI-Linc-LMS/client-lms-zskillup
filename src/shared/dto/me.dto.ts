/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/me.dto.ts.
 */
import { z } from 'zod';

/**
 * Patch the authenticated user's mutable profile fields. Email + role + status
 * are NOT mutable here (admin-only changes elsewhere). passwordHash is never
 * exposed.
 */
export const updateMeSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
  })
  .strict();
export type UpdateMeDto = z.infer<typeof updateMeSchema>;
