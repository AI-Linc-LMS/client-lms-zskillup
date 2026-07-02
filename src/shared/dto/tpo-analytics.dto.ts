/**
 * SHARED CONTRACT — DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/tpo-analytics.dto.ts.
 *
 * TPO dashboard analytics (Batch 5) — response shapes for GET /tpo/analytics.
 * All figures are college-scoped (optionally cohort-scoped) and derived from
 * existing signals (practice / mock / coding / topic coverage + last-active).
 * Interview/communication analytics are intentionally absent (no data source).
 */

/** Placement-readiness band for a student. */
export type ReadinessBand = 'READY' | 'IN_TRAINING' | 'AT_RISK';

export interface TpoOverview {
  totalStudents: number;
  /** Active in the last 14 days (by last-active date). */
  activeStudents: number;
  /** readiness >= 70. */
  placementReady: number;
  /** Mean readiness across students (0 if none). */
  avgReadiness: number;
  /** Low participation AND low performance. */
  atRisk: number;
}

/** Participation × performance quadrant counts. */
export interface TpoQuadrants {
  highPartHighPerf: number;
  highPartLowPerf: number;
  lowPartHighPerf: number;
  lowPartLowPerf: number;
}

export interface TpoCompanyReadiness {
  slug: string;
  name: string;
  readiness: number;
  attempted: number;
}

export interface TpoSkillGap {
  topic: string;
  slug: string;
  accuracy: number;
  attempts: number;
}

export interface TpoStudentRow {
  id: string;
  name: string | null;
  email: string;
  branch: string | null;
  cohortId: string | null;
  readiness: number;
  participation: number;
  band: ReadinessBand;
  lastActiveDate: string | null;
}

export interface TpoDashboard {
  overview: TpoOverview;
  quadrants: TpoQuadrants;
  companyReadiness: TpoCompanyReadiness[];
  skillGaps: TpoSkillGap[];
  students: TpoStudentRow[];
  /** True if the student list was capped (very large college). */
  truncated: boolean;
}
