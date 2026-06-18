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
  collegeName: string | null;
  branch: string | null;
  passoutYear: number | null;
  totalXp: number;
  level: number;
  currentStreakDays: number;
  badgesEarned: number;
  isYou: boolean;
}

export interface ApiLeaderboard {
  entries: ApiLeaderboardEntry[];
  myRank: number | null;
  myEntry: ApiLeaderboardEntry | null;
  total: number;
}

export async function getLeaderboard(scope: 'national' | 'college' = 'national', limit = 50): Promise<ApiLeaderboard> {
  const res = await apiClient.get<ApiLeaderboard>(`/api/v1/students/leaderboard?scope=${scope}&limit=${limit}`, { auth: 'public' });
  return res.data;
}
