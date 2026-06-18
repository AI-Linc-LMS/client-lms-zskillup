import { apiClient } from './client';
import type { ApiQuestion } from './practice';
import type { GamificationSummary } from './gamification-types';

export type ChallengeType = 'MCQ' | 'CODING' | 'OTHER';

// ── Daily challenge ───────────────────────────────────────────────────────────

export interface ApiDailyChallenge {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED';
  questions: ApiQuestion[];
  xpReward: number;
  correctCount: number;
  completedAt: string | null;
}

export async function getDailyChallenge(): Promise<ApiDailyChallenge> {
  const res = await apiClient.get<ApiDailyChallenge>('/api/v1/students/daily-challenge');
  return res.data;
}

export async function completeDailyChallenge(
  correctCount: number,
): Promise<GamificationSummary | null> {
  const res = await apiClient.post<GamificationSummary | null>(
    '/api/v1/students/daily-challenge/complete',
    { correctCount },
  );
  return res.data;
}

// ── Catalog challenges ────────────────────────────────────────────────────────

export interface ApiChallenge {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  xpReward: number;
  coinReward: number;
  completed: boolean;
}

export interface ApiChallengeDetail extends ApiChallenge {
  question: ApiQuestion | null;
}

export interface ApiChallengeSubmitResult {
  correct: boolean;
  completed: boolean;
  gamification: GamificationSummary | null;
}

export async function listChallenges(): Promise<ApiChallenge[]> {
  const res = await apiClient.get<ApiChallenge[]>('/api/v1/students/challenges');
  return res.data;
}

export async function getChallenge(id: string): Promise<ApiChallengeDetail> {
  const res = await apiClient.get<ApiChallengeDetail>(`/api/v1/students/challenges/${id}`);
  return res.data;
}

export async function submitChallenge(
  id: string,
  selectedOptionIds: string[],
): Promise<ApiChallengeSubmitResult> {
  const res = await apiClient.post<ApiChallengeSubmitResult>(
    `/api/v1/students/challenges/${id}/submit`,
    { selectedOptionIds },
  );
  return res.data;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminChallenge {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  refQuestionId: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
  xpReward: number;
  coinReward: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminChallengeInput {
  code?: string;
  title?: string;
  description?: string | null;
  type?: ChallengeType;
  refQuestionId?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  xpReward?: number;
  coinReward?: number;
  isActive?: boolean;
}

export async function listAdminChallenges(): Promise<AdminChallenge[]> {
  const res = await apiClient.get<AdminChallenge[]>('/api/v1/admin/challenges');
  return res.data;
}

export async function createAdminChallenge(dto: AdminChallengeInput): Promise<AdminChallenge> {
  const res = await apiClient.post<AdminChallenge>('/api/v1/admin/challenges', dto);
  return res.data;
}

export async function updateAdminChallenge(
  id: string,
  dto: AdminChallengeInput,
): Promise<AdminChallenge> {
  const res = await apiClient.patch<AdminChallenge>(`/api/v1/admin/challenges/${id}`, dto);
  return res.data;
}

export async function deleteAdminChallenge(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/challenges/${id}`);
}
