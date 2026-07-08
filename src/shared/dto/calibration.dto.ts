/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/calibration.dto.ts.
 *
 * The one-time calibration assessment: whether a student must take it, and their
 * per-section result once they have.
 */

export interface CalibrationScoresDto {
  /** Overall correct % across all sections + coding (0–100). */
  overall: number;
  quant: number;
  logical: number;
  verbal: number;
  technical: number;
  coding: number;
  /** The mock attempt the scores came from. */
  attemptId: string;
}

export interface CalibrationStatusDto {
  /** True when this student must take the calibration before other assessments/practice. */
  required: boolean;
  /** Whether they have completed it. */
  completed: boolean;
  /** Global feature switch (CALIBRATION_ENABLED) — the whole gate is off when false. */
  enabled: boolean;
  /** The calibration mock's id — launch via `/dashboard/quiz?mock=<id>` (null if unseeded). */
  mockTestId: string | null;
  scheduledAssessmentId: string | null;
  /** Per-section result once completed (null otherwise). */
  scores: CalibrationScoresDto | null;
}
