import { apiClient } from './client';
import type { PracticeSubmitDto } from '@/shared/dto/practice.dto';

/**
 * Practice API client (Sprint 3). All endpoints are auth-gated and STUDENT-only.
 */

export interface ApiQuestionOption {
  id: string;
  text: string;
  orderIndex: number;
}

export interface ApiQuestion {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  stem: string;
  topicId: string;
  companyId: string | null;
  options: ApiQuestionOption[];
}

export interface ApiAttemptResult {
  attemptId: string;
  isCorrect: boolean;
  correctOptionIds: string[];
  explanation: string | null;
  timeTakenSec: number;
  usedHint: boolean;
}

export interface ApiAccuracy {
  total: number;
  correct: number;
  accuracyPct: number;
  avgTimeSec: number;
}

export interface ApiTopicAccuracy {
  topicSlug: string;
  topicName: string;
  total: number;
  correct: number;
  accuracyPct: number;
  lastAttemptAt: string;
}

export async function listPracticeQuestions(filters: {
  topic?: string;
  company?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  limit?: number;
}): Promise<ApiQuestion[]> {
  const qs = new URLSearchParams();
  if (filters.topic) qs.set('topic', filters.topic);
  if (filters.company) qs.set('company', filters.company);
  if (filters.difficulty) qs.set('difficulty', filters.difficulty);
  if (filters.limit) qs.set('limit', String(filters.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<ApiQuestion[]>(`/api/v1/practice/questions${suffix}`);
  return res.data;
}

export async function submitPracticeAttempt(dto: PracticeSubmitDto): Promise<ApiAttemptResult> {
  const res = await apiClient.post<ApiAttemptResult>('/api/v1/practice/attempts', dto);
  return res.data;
}

export async function requestPracticeHint(attemptId: string): Promise<{ hint: string | null }> {
  const res = await apiClient.post<{ hint: string | null }>(
    `/api/v1/practice/attempts/${attemptId}/hint`,
  );
  return res.data;
}

/** Reveal a question's hint BEFORE answering (sets usedHint on the next attempt). */
export async function getQuestionHint(questionId: string): Promise<{ hint: string | null }> {
  const res = await apiClient.get<{ hint: string | null }>(
    `/api/v1/practice/questions/${questionId}/hint`,
  );
  return res.data;
}

export async function getPracticeAccuracy(): Promise<ApiAccuracy> {
  const res = await apiClient.get<ApiAccuracy>('/api/v1/practice/accuracy');
  return res.data;
}

/** Per-topic accuracy, most recently practised first (weak/recent topic surfaces). */
export async function getTopicAccuracy(): Promise<ApiTopicAccuracy[]> {
  const res = await apiClient.get<ApiTopicAccuracy[]>('/api/v1/practice/accuracy/topics');
  return res.data;
}
