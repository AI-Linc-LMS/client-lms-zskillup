import { apiClient } from './client';
import type { MockAnswerDto } from '@/shared/dto/mock.dto';

/**
 * Mock-test API client (Sprint 4). All endpoints are auth-gated and STUDENT-only.
 * Timing is server-authoritative — the client countdown is driven by `expiresAt`
 * returned from `startMock`, never by a local timer the user could tamper with.
 */

export interface ApiMockSummary {
  id: string;
  title: string;
  companyId: string | null;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  isAdaptive: boolean;
}

export interface ApiMockOption {
  id: string;
  text: string;
  orderIndex: number;
}

export interface ApiMockQuestion {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  stem: string;
  options: ApiMockOption[];
}

export interface ApiMockSavedAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface ApiMockStart {
  attemptId: string;
  mockTestId: string;
  title: string;
  durationMinutes: number;
  startedAt: string;
  expiresAt: string;
  questions: ApiMockQuestion[];
  savedAnswers: ApiMockSavedAnswer[];
}

export type MockAttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface ApiMockResult {
  attemptId: string;
  status: MockAttemptStatus;
  score: number;
  total: number;
  percentile: number;
  pct: number;
  passed: boolean;
  timeTakenSec: number;
  avgSecPerQuestion: number;
}

export interface ApiMockAttemptHistory {
  attemptId: string;
  mockTestId: string;
  title: string;
  status: MockAttemptStatus;
  score: number;
  total: number;
  pct: number;
  percentile: number;
  passed: boolean;
  timeTakenSec: number;
  submittedAt: string | null;
}

export interface ApiMockReviewQuestion {
  id: string;
  stem: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation: string | null;
  options: Array<{ id: string; text: string; orderIndex: number; isCorrect: boolean }>;
  correctOptionIds: string[];
  yourOptionIds: string[];
  isCorrect: boolean;
}

export interface ApiMockTopicBreakdown {
  topic: string;
  correct: number;
  total: number;
}

export interface ApiMockReport extends ApiMockResult {
  title: string;
  passingScore: number;
  submittedAt: string | null;
  topicBreakdown: ApiMockTopicBreakdown[];
  questions: ApiMockReviewQuestion[];
}

export async function listMocks(): Promise<ApiMockSummary[]> {
  const res = await apiClient.get<ApiMockSummary[]>('/api/v1/mocks');
  return res.data;
}

export async function getMock(id: string): Promise<ApiMockSummary> {
  const res = await apiClient.get<ApiMockSummary>(`/api/v1/mocks/${id}`);
  return res.data;
}

export async function startMock(id: string): Promise<ApiMockStart> {
  const res = await apiClient.post<ApiMockStart>(`/api/v1/mocks/${id}/start`);
  return res.data;
}

export async function answerMock(attemptId: string, dto: MockAnswerDto): Promise<{ ok: boolean }> {
  const res = await apiClient.post<{ ok: boolean }>(
    `/api/v1/mocks/attempts/${attemptId}/answer`,
    dto,
  );
  return res.data;
}

export async function submitMock(attemptId: string): Promise<ApiMockResult> {
  const res = await apiClient.post<ApiMockResult>(`/api/v1/mocks/attempts/${attemptId}/submit`);
  return res.data;
}

export async function getMockReport(attemptId: string): Promise<ApiMockReport> {
  const res = await apiClient.get<ApiMockReport>(`/api/v1/mocks/attempts/${attemptId}/report`);
  return res.data;
}

/** The student's finalized attempts, newest first — powers the /mock-tests history. */
export async function getMockHistory(): Promise<ApiMockAttemptHistory[]> {
  const res = await apiClient.get<ApiMockAttemptHistory[]>('/api/v1/mocks/attempts/mine');
  return res.data;
}
