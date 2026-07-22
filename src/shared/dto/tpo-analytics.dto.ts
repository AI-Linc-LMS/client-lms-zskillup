/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at frontend-repo/src/shared/dto/tpo-analytics.dto.ts.
 *
 * TPO dashboard analytics (Batch 5) - response shapes for GET /tpo/analytics.
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
  rollNumber: string | null;
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

/** College identity + headline counts for the TPO console chrome (brand lockup,
 *  batch selector). Cheap identity read - heavy analytics stay on the dashboard. */
export interface TpoCollegeSummary {
  collegeName: string;
  collegeSlug: string;
  logoUrl: string | null;
  city: string | null;
  state: string | null;
  totalStudents: number;
  cohortCount: number;
}

// ── Student drill-down (Student Analytics) ──────────────────────────────────────

export interface TpoReadinessComponent {
  label: string;
  score: number;
  active: boolean;
}
export interface TpoStudentCompanyPerf {
  slug: string;
  name: string;
  readiness: number;
  level: string;
  questionsAttempted: number;
  questionAccuracy: number;
  codingSolved: number;
  codingTotal: number;
}
export interface TpoStudentTopicPerf {
  topic: string;
  slug: string;
  accuracy: number;
  attempts: number;
  level: string;
}
/** Full per-student profile for the drill-down drawer. Reuses the unified
 *  readiness composite (practice/mock/coding/coverage) + per-company + weak
 *  topics, plus college-scoped identity. */
export interface TpoStudentDetail {
  id: string;
  name: string | null;
  email: string;
  rollNumber: string | null;
  branch: string | null;
  cohortId: string | null;
  lastActiveDate: string | null;
  readiness: number;
  level: string;
  band: ReadinessBand;
  participation: number;
  components: TpoReadinessComponent[];
  companies: TpoStudentCompanyPerf[];
  topics: TpoStudentTopicPerf[];
}

// ── AI Recommended Actions (cohort) ─────────────────────────────────────────────

export interface TpoRecommendation {
  title: string;
  detail: string;
  /** The student segment this action targets. */
  group: string;
  priority: 'high' | 'medium' | 'low';
}
/** Cohort-level recommended interventions. `generatedByAi` distinguishes a real
 *  model response from the deterministic rules fallback (both use live metrics). */
export interface TpoRecommendations {
  generatedByAi: boolean;
  actions: TpoRecommendation[];
  basis: string;
}

// ── Company Readiness heatmap ───────────────────────────────────────────────────

export interface TpoCompanyHeatmapRow {
  slug: string;
  name: string;
  /** Student counts across accuracy bands: [<40, 40–59, 60–79, ≥80]. */
  bands: number[];
  total: number;
}
export interface TpoCompanyHeatmap {
  rows: TpoCompanyHeatmapRow[];
}

// ── Coding Analytics ────────────────────────────────────────────────────────────

export interface TpoCodingBucket {
  solved: number;
  attempted: number;
}
export interface TpoCodingCompany {
  slug: string;
  name: string;
  solved: number;
  attempted: number;
  solveRate: number;
}
export interface TpoCodingAnalytics {
  activeCoders: number;
  totalSolved: number;
  totalAttempted: number;
  /** Campus coding-readiness proxy: solved / attempted across the cohort. */
  solveRate: number;
  difficulty: { easy: TpoCodingBucket; medium: TpoCodingBucket; hard: TpoCodingBucket };
  companies: TpoCodingCompany[];
}

// ── Placement Readiness trend (lazy weekly snapshots) ───────────────────────────

export interface TpoReadinessTrendPoint {
  date: string;
  avgReadiness: number;
  placementReady: number;
  total: number;
}
export interface TpoReadinessTrend {
  points: TpoReadinessTrendPoint[];
  /** True until ≥2 snapshots exist (not enough to draw a line yet). */
  collecting: boolean;
}

// ── Placement outcomes (real offers) ────────────────────────────────────────────

export interface TpoPlacement {
  id: string;
  studentId: string;
  studentName: string | null;
  companyName: string;
  role: string | null;
  ctcLpa: number | null;
  offerType: string;
  status: string;
  offerDate: string | null;
  createdAt: string;
}
export interface TpoPlacementSummary {
  studentsPlaced: number;
  totalOffers: number;
  placementRatePct: number;
  avgCtcLpa: number | null;
  highestCtcLpa: number | null;
  byCompany: Array<{ company: string; offers: number }>;
}

// ── Interview Analytics ─────────────────────────────────────────────────────────

export interface TpoInterviewWeakness {
  area: string;
  count: number;
}
/** Per-student interview breakdown row (capped, readiness-desc). */
export interface TpoInterviewStudentRow {
  id: string;
  name: string | null;
  branch: string | null;
  interviews: number;
  readiness: number | null;
  communication: number | null;
  confidence: number | null;
  lastAt: string | null;
}
/** Department (branch) roll-up of interview performance. */
export interface TpoInterviewBranchRow {
  branch: string;
  students: number;
  interviews: number;
  readiness: number | null;
}
/** Readiness-score distribution bucket (0-20 … 80-100). */
export interface TpoInterviewBucket {
  bucket: string;
  count: number;
}
/** Interviews taken + avg readiness per day (days with activity). */
export interface TpoInterviewTrendPoint {
  date: string;
  interviews: number;
  readiness: number | null;
}
/** Scores are null when no graded interview data exists for that dimension -
 *  communication/confidence only populate on interviews graded after that
 *  pipeline shipped, so the UI can honestly show "needs data". */
export interface TpoInterviewAnalytics {
  studentsAttempted: number;
  totalInterviews: number;
  interviewReadiness: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  commonWeaknesses: TpoInterviewWeakness[];
  /** Per-student breakdown (readiness-desc, capped). */
  students: TpoInterviewStudentRow[];
  /** Department / branch roll-up. */
  byBranch: TpoInterviewBranchRow[];
  /** Readiness score distribution. */
  distribution: TpoInterviewBucket[];
  /** Activity + avg readiness over time. */
  trend: TpoInterviewTrendPoint[];
}

// ── Assessment Center ───────────────────────────────────────────────────────────

export type TpoAssessmentStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'COMPLETED';
export interface TpoAssessment {
  id: string;
  title: string;
  companyId: string | null;
  companyName: string | null;
  mockTestId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  proctored: boolean;
  cohortId: string | null;
  resultsReleased: boolean;
  status: TpoAssessmentStatus;
  assigned: number;
  attempted: number;
}
export interface TpoAssessmentStats {
  total: number;
  upcoming: number;
  live: number;
  completed: number;
  studentsAssigned: number;
}
export interface TpoAssessmentList {
  assessments: TpoAssessment[];
  stats: TpoAssessmentStats;
  /** Active (Draft+Scheduled+Live) count vs the per-college cap. */
  activeCount: number;
  activeCap: number;
}
