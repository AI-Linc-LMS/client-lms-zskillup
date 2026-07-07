import { apiClient } from './client';

export type DailyQuestKind = 'PRACTICE' | 'MOCK';
export type DailyQuestStatus = 'PENDING' | 'COMPLETED' | 'MISSED';

export interface ApiStudentStats {
  totalXp: number;
  level: number;
  coins: number;
  currentStreakDays: number;
  longestStreakDays: number;
  /** XP accrued within the current level — used for the XP bar fill percentage. */
  xpIntoLevel: number;
  /** Full XP span of the current level. */
  xpForNextLevel: number;
  badgesEarned: number;
}

export interface ApiDailyQuest {
  id: string;
  kind: DailyQuestKind;
  refId: string;
  title: string;
  xpReward: number;
  coinReward: number;
  status: DailyQuestStatus;
  completedAt: string | null;
}

export interface ApiBadge {
  code: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  earned: boolean;
  earnedAt: string | null;
}

export async function getStudentStats(): Promise<ApiStudentStats> {
  const res = await apiClient.get<ApiStudentStats>('/api/v1/students/stats');
  return res.data;
}

export async function getDailyQuest(): Promise<ApiDailyQuest> {
  const res = await apiClient.get<ApiDailyQuest>('/api/v1/students/daily-quest');
  return res.data;
}

export async function submitDailyQuest(questId: string): Promise<void> {
  await apiClient.post<void>('/api/v1/students/daily-quest/submit', { questId });
}

export async function getBadges(): Promise<ApiBadge[]> {
  const res = await apiClient.get<ApiBadge[]>('/api/v1/students/badges');
  return res.data;
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface ApiLeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string | null;
  initials: string;
  avatarUrl: string | null;
  collegeName: string | null;
  city: string | null;
  branch: string | null;
  passoutYear: number | null;
  totalXp: number;
  level: number;
  currentStreakDays: number;
  badgesEarned: number;
  /** Rank change vs. last week (positive = climbed). null = no prior data. */
  trend: number | null;
  isYou: boolean;
}

export interface ApiLeaderboard {
  entries: ApiLeaderboardEntry[];
  myRank: number | null;
  myEntry: ApiLeaderboardEntry | null;
  total: number;
  totalStudents: number;
  topStreak: number;
}

export type LeaderboardScope = 'national' | 'college' | 'company' | 'city';

export async function getLeaderboard(
  scope: LeaderboardScope = 'national',
  limit = 50,
  opts?: { companyId?: string; city?: string },
): Promise<ApiLeaderboard> {
  // Default posture (NOT 'public'): a signed-in caller's token is attached (with
  // the pre-emptive refresh on a cold load) so the backend can resolve "your
  // rank". The route is @Public, so a logged-out visitor still gets the board
  // (no 401, no redirect) — they just have no personal rank.
  const params = new URLSearchParams({ scope, limit: String(limit) });
  if (scope === 'company' && opts?.companyId) params.set('companyId', opts.companyId);
  if (scope === 'city' && opts?.city) params.set('city', opts.city);
  const res = await apiClient.get<ApiLeaderboard>(`/api/v1/students/leaderboard?${params.toString()}`);
  return res.data;
}

/** Cities that have ranked students — options for the leaderboard City filter. */
export async function getLeaderboardCities(): Promise<string[]> {
  const res = await apiClient.get<string[]>('/api/v1/students/leaderboard/cities');
  return res.data;
}
