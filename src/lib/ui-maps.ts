import type { StatusTone } from '@/components/student/StatusPill';

/**
 * Canonical accent maps (frontend/CLAUDE §4.8/§4.11) - ONE definition each so
 * a difficulty or category can never render two different treatments.
 */

/** Difficulty as inline pill classes (quiz/practice surfaces - §4.11 ring style). */
export const DIFFICULTY_RING: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-red-50 text-red-700 ring-red-200',
};

/** Difficulty as a `<StatusPill tone label>` pair (tables/cards). */
export const DIFFICULTY_TONE: Record<string, { tone: StatusTone; label: string }> = {
  EASY: { tone: 'positive', label: 'Easy' },
  MEDIUM: { tone: 'info', label: 'Medium' },
  HARD: { tone: 'warning', label: 'Hard' },
  BEGINNER: { tone: 'positive', label: 'Beginner' },
  INTERMEDIATE: { tone: 'info', label: 'Intermediate' },
  ADVANCED: { tone: 'warning', label: 'Advanced' },
};

/** Course-category display labels (catalog surfaces). */
export const CATEGORY_LABEL: Record<string, string> = {
  APTITUDE: 'Aptitude',
  PROGRAMMING_DSA: 'Programming · DSA',
  COMMUNICATION_HR: 'Communication · HR',
  MOCK_DRIVE: 'Mock drive',
};
