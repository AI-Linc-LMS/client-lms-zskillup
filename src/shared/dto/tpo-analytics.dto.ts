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

/** Participation x performance quadrant counts. */
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

/**
 * ACTIVITY SCORE - the weighted engagement VOLUME behind every "Activity Score"
 * label in the UI. The JSON field keeps its original name `participation` for
 * contract stability (ADR-011); only the human-facing label changed, because the
 * number never measured attendance:
 *
 *     participation = practiceAnswered + 3 x mocksCompleted + 2 x codingProblems
 *
 * Caveat worth knowing before acting on it: a mock test's MCQ answers are ALSO
 * mirrored into `practice_attempts`, so a completed mock counts once through
 * `practiceAnswered` (per question) and again through the x3 weight. The three
 * components are exposed alongside it so a TPO can see exactly what drove the
 * score instead of trusting one opaque number.
 */
export interface TpoActivityComponents {
  /** Practice questions answered (count over practice_attempts; includes mock MCQs). */
  practiceAnswered: number;
  /** Mock attempts that are no longer IN_PROGRESS. */
  mocksCompleted: number;
  /** DISTINCT coding problems attempted. */
  codingProblems: number;
}

export interface TpoStudentRow extends TpoActivityComponents {
  id: string;
  name: string | null;
  email: string;
  rollNumber: string | null;
  branch: string | null;
  cohortId: string | null;
  readiness: number;
  /** Activity Score - see {@link TpoActivityComponents}. */
  participation: number;
  band: ReadinessBand;
  lastActiveDate: string | null;
  /** Real last-active TIMESTAMP (max of any practice/mock/coding activity); null if none. */
  lastActiveAt: string | null;
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

/** Extra participation & engagement roll-ups (Phase 4) - signals beyond the core
 *  dashboard: gamification engagement, company-drive registrations, live-session
 *  sign-ups. Each figure degrades to 0 if its source table isn't present. */
export interface TpoParticipation {
  /** Students with a current daily streak. */
  activeStreaks: number;
  /** Mean total XP across the cohort. */
  avgXp: number;
  /** Badges earned across the cohort. */
  totalBadges: number;
  /** Daily quests completed (all time). */
  questsCompleted: number;
  /** Company-drive registrations (registered or completed). */
  driveRegistrations: number;
  /** Company-drive registrations marked completed. */
  driveCompletions: number;
  /** Live-session sign-ups by these students. */
  liveSessionSignups: number;
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
export interface TpoStudentDetail extends TpoActivityComponents {
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
  /** Activity Score - see {@link TpoActivityComponents}. */
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
  /** Student counts across accuracy bands: [<40, 40-59, 60-79, >=80]. */
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

/** One student's coding roll-up for the per-student breakdown (#5). `easy/medium/hard`
 *  are DISTINCT problems SOLVED at each difficulty; `codingReadiness` is a
 *  difficulty-weighted solve rate (easyx1, mediumx2, hardx3), distinct from raw
 *  `accuracy` (solved / attempted). */
export interface TpoCodingStudentRow {
  id: string;
  name: string | null;
  branch: string | null;
  easy: number;
  medium: number;
  hard: number;
  solved: number;
  attempted: number;
  accuracy: number;
  codingReadiness: number;
  lastActive: string | null;
}
/** Per-company coding performance for one student. */
export interface TpoCodingStudentCompany {
  slug: string;
  name: string;
  attempted: number;
  solved: number;
  accuracy: number;
  readiness: number;
}
/** Drill-down for one student's coding practice. */
export interface TpoCodingStudentDetail {
  id: string;
  name: string | null;
  topicsPracticed: string[];
  codingReadiness: number;
  accuracy: number;
  difficulty: { easy: TpoCodingBucket; medium: TpoCodingBucket; hard: TpoCodingBucket };
  companies: TpoCodingStudentCompany[];
}

/**
 * One student's readiness for a SELECTED company (#7). ROSTER-WIDE: every student in
 * the college/cohort appears, with zeroes when they have done nothing for that
 * company (the report used to INNER JOIN coding submissions, so it listed only the
 * handful of students who had submitted code and hid everyone doing MCQ practice).
 *
 * `readiness` is the SAME per-company blend the student sees on their own dashboard
 * (ReadinessService.companyReadinessScore): 0.7 x MCQ accuracy + 0.3 x coding solve
 * rate over the components that have data, scaled by min(1, sample / 20) so a couple
 * of correct PYQs cannot read as "placement-ready".
 */
export interface TpoCompanyReadinessStudent {
  id: string;
  name: string | null;
  email: string;
  /** 0-100 blended readiness for this company (identical to the student's own figure). */
  readiness: number;
  /** MCQ correct / attempted on this company's tagged questions (0 when none). */
  accuracy: number;
  /** MCQ attempts on this company's tagged questions. */
  questionsAttempted: number;
  /** DISTINCT coding problems attempted among this company's tagged problems. */
  codingAttempted: number;
  /** DISTINCT coding problems solved among this company's tagged problems. */
  codingSolved: number;
  /** ATTEMPTED items at each difficulty - MCQs (question difficulty) + coding
   *  problems (problem difficulty). easy + medium + hard = questionsAttempted +
   *  codingAttempted, minus anything whose difficulty is unset. */
  easy: number;
  medium: number;
  hard: number;
  /** Correct/solved counterparts of easy/medium/hard. */
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  /** Distinct topic names from MCQ practice plus coding-problem tags. */
  topicsPracticed: string[];
  /** greatest(max practice attempted_at, max coding created_at); null if never active. */
  lastActiveAt: string | null;
}
/** Student-level Company Readiness report for one company. */
export interface TpoCompanyReadinessReport {
  company: { slug: string; name: string };
  students: TpoCompanyReadinessStudent[];
  /** True if the roster was capped (very large college) - same convention as TpoDashboard. */
  truncated: boolean;
}

// ── Placement Readiness trend (daily snapshots) ─────────────────────────────────

/** ONE point per calendar date in the requested window. A date with no snapshot is
 *  still returned, with every metric null - "no data recorded", never a zero or an
 *  interpolated value. */
export interface TpoReadinessTrendPoint {
  /** YYYY-MM-DD. */
  date: string;
  /** Mean readiness of the scope on that date; null when no snapshot exists. */
  avgReadiness: number | null;
  /** Students at readiness >= 70 on that date; null when no snapshot exists. */
  placementReady: number | null;
  /** Roster size on that date; null when no snapshot exists. */
  total: number | null;
}
export interface TpoReadinessTrend {
  /** Dense scaffold: one entry for EVERY date from `from` to `to`, inclusive. */
  points: TpoReadinessTrendPoint[];
  /** Resolved window (YYYY-MM-DD), echoed even when the request omitted from/to. */
  from: string;
  to: string;
  /** points.length - dates in the resolved window. */
  daysInRange: number;
  /** Dates that have a snapshot. */
  daysWithData: number;
  /** daysInRange minus daysWithData. */
  daysMissing: number;
  /** Mean of `avgReadiness` over the days WITH data; null when none has data. */
  avgReadiness: number | null;
  /** The most recent day with data in this window; null when none has data. */
  latest: TpoReadinessTrendPoint | null;
  /** latest.avgReadiness minus the first data day's avgReadiness; null with <2 data days. */
  change: number | null;
  /** True until >=2 dates in the window have a snapshot (not enough to draw a line). */
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
/** Readiness-score distribution bucket (0-20 ... 80-100). */
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
/** communicationScore / confidenceScore are null when NO interview in scope carries
 *  them. That is an AI-grading failure, not a missing feature: the heuristic fallback
 *  cannot score those dimensions, so an interview graded during an OpenAI outage has a
 *  readiness score and nothing else. Compare aiGradedInterviews with
 *  totalGradedInterviews to see how much of the cohort is affected. */
export interface TpoInterviewAnalytics {
  studentsAttempted: number;
  totalInterviews: number;
  /** Grading coverage. `aiGradedInterviews` are the graded interviews that actually
   *  carry the AI sub-scores; `totalGradedInterviews` is the denominator (the same
   *  count as `totalInterviews`, named explicitly so the pair reads as a ratio). A gap
   *  means AI grading FAILED for those interviews and they can be re-graded - it is
   *  never a sign that students simply practised less. */
  aiGradedInterviews: number;
  totalGradedInterviews: number;
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

/** One question->answer turn of a graded interview transcript, for the TPO drill-down. */
export interface TpoStudentInterviewTurn {
  question: string;
  answer: string;
  answeredAt: string | null;
  /** Per-question score (0-100) if the evaluation graded it. */
  score: number | null;
}
/** One of a student's mock interviews with its transcript + scores. */
export interface TpoStudentInterview {
  id: string;
  topic: string;
  interviewType: string;
  difficulty: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  overallPercentage: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  strengths: string[];
  areasForImprovement: string[];
  overallFeedback: string | null;
  transcript: TpoStudentInterviewTurn[];
}
/** A student's full interview history (latest->oldest) for the TPO drill-down. */
export interface TpoStudentInterviews {
  studentId: string;
  studentName: string | null;
  interviews: TpoStudentInterview[];
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
  /** Hard close of the availability window, or null = open-ended. THE gate on whether a
   *  student may still start (never scheduledAt + durationMinutes, which is the
   *  per-attempt limit); an admin can move it even after attempts have started. */
  endsAt: string | null;
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

/**
 * Where a reportable drive came from, from THIS college's point of view.
 *
 *   OWN        the college created it (Assessment Center) — the report covers the
 *              whole sitting, exactly as it always has.
 *   ATTEMPTED  someone else's drive (platform-wide, or another college's) that at
 *              least one of this college's students sat. The report covers THIS
 *              college's students only — see TpoAssessmentsService.results.
 */
export type TpoAssessmentScope = 'OWN' | 'ATTEMPTED';

/**
 * One drive a college can pull a student report for. Deliberately NOT TpoAssessment:
 * an ATTEMPTED drive belongs to somebody else, so this carries only what is needed to
 * name it in a picker and nothing that would describe another college's cohort (no
 * assigned/attempted totals for the whole drive, no owning college).
 */
export interface TpoReportableAssessment {
  id: string;
  title: string;
  /** Recruiter name, or null for a sectional / platform-wide drive. */
  companyName: string | null;
  scheduledAt: string;
  endsAt: string | null;
  status: TpoAssessmentStatus;
  scope: TpoAssessmentScope;
  /** Attempts BY THIS COLLEGE's students — exactly how many rows the report will have. */
  collegeAttempts: number;
}

export interface TpoReportableAssessmentList {
  assessments: TpoReportableAssessment[];
}
