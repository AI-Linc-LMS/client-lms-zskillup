/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/tpo.dto.ts.
 *
 * TPO endpoints (Implementation Plan §4). v1 ships the bulk-invite flow;
 * dashboard + at-risk + reports land in Sprint 7 once PPS is computable.
 */
import { z } from 'zod';

const emailField = z.string().trim().toLowerCase().email();

/**
 * Sprint 1 — TPO bulk-invite by CSV. The wire format is plain rows so the
 * frontend can upload a CSV directly; we sanitize against CSV injection
 * server-side (SECURITY_STANDARDS §4 — leading =, +, @, - in fields is escaped).
 */
export const tpoBulkInviteSchema = z.object({
  invitations: z
    .array(
      z.object({
        email: emailField,
        fullName: z.string().trim().min(2).max(120).optional(),
        rollNumber: z.string().trim().max(50).optional(),
      }),
    )
    .min(1, 'Add at least one student')
    .max(500, 'Upload up to 500 students per batch'),
});
export type TpoBulkInviteDto = z.infer<typeof tpoBulkInviteSchema>;

export interface TpoBulkInviteResult {
  /** Number of new invitations created. */
  created: number;
  /** Number skipped because the email is already registered (any role). */
  skipped: number;
  /** Per-row outcome for client-side reporting. */
  rows: Array<{
    email: string;
    status: 'created' | 'skipped' | 'invalid';
    reason?: string;
  }>;
}
