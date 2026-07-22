/**
 * SHARED CONTRACT - DUPLICATED ACROSS BOTH REPOS (ADR-011).
 * Mirrored byte-for-byte at the same path in the other repo. Change both together.
 *
 * Smart Study Plan - the fixed, AI-generated 90-day placement-prep roadmap built
 * once from a student's calibration result. Days drip-unlock one per calendar day.
 */

export type StudyPhase = 'foundation' | 'practice' | 'interview';
export type StudyTaskKind = 'learn' | 'practice' | 'quiz' | 'mock' | 'coding' | 'review';
/** locked = not yet unlocked; available = unlocked past day (catch-up); today =
 *  the current day; completed = every task done. */
export type StudyDayStatus = 'locked' | 'available' | 'today' | 'completed';

export interface StudyTaskDto {
  /** Stable 0-based index within the day - the completion key. */
  index: number;
  kind: StudyTaskKind;
  title: string;
  detail: string;
  /** Deep-link into the concrete activity (e.g. /dashboard/quiz/adaptive?topic=…). */
  href: string;
  cta: string;
  /** Leaf/section topic slug this task drills, when applicable - drives auto-verify. */
  targetSlug: string | null;
  estMinutes: number;
  /** True once auto-verified from real activity OR ticked manually. */
  done: boolean;
}

export interface StudyDayDto {
  dayNumber: number;
  phase: StudyPhase;
  phaseLabel: string;
  theme: string;
  focusSection: string | null;
  /** ISO date (yyyy-mm-dd) this day unlocks. */
  unlockDate: string;
  status: StudyDayStatus;
  tasks: StudyTaskDto[];
  estMinutes: number;
  xp: number;
  completedAt: string | null;
  doneCount: number;
  taskCount: number;
}

/** Lightweight day node for the full 90-step roadmap rail. */
export interface StudyDayNodeDto {
  dayNumber: number;
  phase: StudyPhase;
  theme: string;
  status: StudyDayStatus;
  unlockDate: string;
  xp: number;
  doneCount: number;
  taskCount: number;
}

export interface StudyPhaseMetaDto {
  key: StudyPhase;
  label: string;
  startDay: number;
  endDay: number;
  daysCompleted: number;
}

export interface StudyPlanSummaryDto {
  /** Whether a plan exists for this student. */
  exists: boolean;
  /** Whether calibration is done (the precondition to generate a plan). */
  calibrated: boolean;
  generatedAt: string | null;
  startDate: string | null;
  totalDays: number;
  /** 1-based index of "today" within the plan (clamped 1..totalDays); null if none. */
  currentDay: number | null;
  currentPhase: StudyPhase | null;
  progressPct: number;
  daysCompleted: number;
  tasksCompleted: number;
  tasksTotal: number;
  /** Consecutive completed roadmap days ending at the most recent unlocked day. */
  streakDays: number;
  planXp: number;
  band: string | null;
  bandLabel: string | null;
  goalSummary: string | null;
  generatedByAi: boolean;
  phases: StudyPhaseMetaDto[];
}

/** Overview payload for GET /me/study-plan/overview - powers the whole page. */
export interface StudyPlanOverviewDto {
  summary: StudyPlanSummaryDto;
  /** Today's day detail (null when no plan / plan not yet started). */
  today: StudyDayDto | null;
  /** All day-nodes for the roadmap rail (empty when no plan). */
  days: StudyDayNodeDto[];
}

/** Result of toggling a task's completion. */
export interface StudyTaskToggleResultDto {
  dayNumber: number;
  taskIndex: number;
  done: boolean;
  /** Day flipped to completed by this toggle (fires the celebration + XP). */
  dayCompleted: boolean;
  doneCount: number;
  taskCount: number;
  xpAwarded: number;
}
