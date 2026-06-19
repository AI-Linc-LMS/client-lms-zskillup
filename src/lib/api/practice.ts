import { apiClient } from './client';
import type { PracticeSubmitDto } from '@/shared/dto/practice.dto';
import type { GamificationSummary } from './gamification-types';

/**
 * Practice API client (Sprint 3). All endpoints are auth-gated and STUDENT-only.
 */

export interface ApiQuestionOption {
  id: string;
  text: string;
  orderIndex: number;
}

export interface ApiQuestionCompanyTag {
  companyId: string;
  importance: string;
}

export interface ApiQuestion {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  stem: string;
  /** Backend `QuestionPublicDto` field names — was previously mistyped as
   *  topicId/companyId, which never matched the wire shape. */
  subtopicId: string;
  companyTags: ApiQuestionCompanyTag[];
  options: ApiQuestionOption[];
}

export interface ApiAttemptResult {
  attemptId: string;
  isCorrect: boolean;
  correctOptionIds: string[];
  explanation: string | null;
  timeTakenSec: number;
  usedHint: boolean;
  /** XP/streak deltas from this attempt (null on idempotent replay). */
  gamification?: GamificationSummary | null;
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
  /** Subtopic slug — the backend filters on `subtopic`. `topic` is accepted as
   *  an alias for back-compat. */
  topic?: string;
  subtopic?: string;
  company?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  year?: number;
  limit?: number;
}): Promise<ApiQuestion[]> {
  const qs = new URLSearchParams();
  const subtopic = filters.subtopic ?? filters.topic;
  if (subtopic) qs.set('subtopic', subtopic);
  if (filters.company) qs.set('company', filters.company);
  if (filters.difficulty) qs.set('difficulty', filters.difficulty);
  if (filters.year) qs.set('year', String(filters.year));
  if (filters.limit) qs.set('limit', String(filters.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<ApiQuestion[]>(`/api/v1/practice/questions${suffix}`);
  return res.data;
}

export async function submitPracticeAttempt(dto: PracticeSubmitDto): Promise<ApiAttemptResult> {
  const res = await apiClient.post<ApiAttemptResult>('/api/v1/practice/attempts', dto);
  return res.data;
}

/** A small random warm-up set for the dashboard Quick Aptitude widget. */
export async function getQuickAptitude(limit = 5): Promise<ApiQuestion[]> {
  const res = await apiClient.get<ApiQuestion[]>(`/api/v1/practice/quick-aptitude?limit=${limit}`);
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
