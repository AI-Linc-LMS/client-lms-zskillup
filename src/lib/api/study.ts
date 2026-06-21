import { apiClient } from './client';
import type { ApiQuestion } from './practice';

// ── Types ────────────────────────────────────────────────────────────────────

export type StudyActionKind = 'review' | 'practice' | 'assessment' | 'adaptive';

export interface StudyAction {
  kind: StudyActionKind;
  title: string;
  detail: string;
  href: string;
  cta: string;
  estMinutes: number;
  count: number | null;
}

export interface StudyPlan {
  actions: StudyAction[];
  reviewDue: number;
  readiness: number;
}

export interface TrendPoint {
  weekStart: string;
  practicePct: number | null;
  practiceCount: number;
  mockPct: number | null;
  mockCount: number;
}

export interface Trends {
  weeks: TrendPoint[];
}

export interface ReviewStats {
  due: number;
  total: number;
  mastered: number;
}

export interface ReviewDue {
  due: number;
  total: number;
  questions: ApiQuestion[];
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

export async function getStudyPlan(): Promise<StudyPlan> {
  const res = await apiClient.get<StudyPlan>('/api/v1/me/study-plan');
  return res.data;
}

export async function getTrends(weeks = 8): Promise<Trends> {
  const res = await apiClient.get<Trends>(`/api/v1/me/trends?weeks=${weeks}`);
  return res.data;
}

export async function getReviewStats(): Promise<ReviewStats> {
  const res = await apiClient.get<ReviewStats>('/api/v1/me/review/stats');
  return res.data;
}

export async function getReviewDue(limit = 20): Promise<ReviewDue> {
  const res = await apiClient.get<ReviewDue>(`/api/v1/me/review/due?limit=${limit}`);
  return res.data;
}
