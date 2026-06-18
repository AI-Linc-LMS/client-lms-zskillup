/**
 * XP/streak/level deltas returned by the backend on a graded submission
 * (mock or practice). Drives the reward animation. Mirrors the backend
 * GamificationSummaryDto. `null` means no reward was computed (e.g. a replay,
 * or gamification temporarily unavailable).
 */
export interface GamificationSummary {
  xpEarned: number;
  coinsEarned: number;
  totalXp: number;
  level: number;
  prevLevel: number;
  leveledUp: boolean;
  streakDays: number;
  streakIncreased: boolean;
  xpIntoLevel: number;
  xpForNextLevel: number;
  newBadges: number;
}
