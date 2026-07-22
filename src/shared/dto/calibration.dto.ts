/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at backend-repo/src/shared/dto/calibration.dto.ts.
 *
 * The one-time calibration assessment: whether a student must take it, and their
 * per-section result once they have.
 */
import type { RecommendationDto } from './recommendations.dto';

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
  /** Global feature switch (CALIBRATION_ENABLED) - the whole gate is off when false. */
  enabled: boolean;
  /** The calibration mock's id - launch via `/dashboard/quiz?mock=<id>` (null if unseeded). */
  mockTestId: string | null;
  scheduledAssessmentId: string | null;
  /** Per-section result once completed (null otherwise). */
  scores: CalibrationScoresDto | null;
}

/** One section's calibration result (for the results page). */
export interface CalibrationSectionResultDto {
  key: string;
  label: string;
  score: number;
}

/** The recommendation-centric calibration results - powers the post-assessment
 *  results page (and mirrors the dashboard recommendations). */
export interface CalibrationResultsDto {
  calibrated: boolean;
  overall: number;
  band: 'High' | 'Medium' | 'Low';
  /** Human band label, e.g. "Placement-ready" / "Developing" / "Building foundations". */
  bandLabel: string;
  /** All sections in a stable order. */
  sections: CalibrationSectionResultDto[];
  /** Strongest sections (score desc), for "your strong areas". */
  strengths: CalibrationSectionResultDto[];
  /** Weakest sections (score asc, below the weak bar), for "focus areas". */
  gaps: CalibrationSectionResultDto[];
  /** Top company matches (readiness desc). */
  companies: Array<{ slug: string; name: string; readiness: number }>;
  topCompany: { slug: string; name: string; readiness: number } | null;
  /** Ranked product recommendations (same engine as the dashboard). */
  recommendations: RecommendationDto[];
  best: RecommendationDto | null;
  /** AI-written personal summary tying the result to the recommendation. */
  aiSummary: string;
}
