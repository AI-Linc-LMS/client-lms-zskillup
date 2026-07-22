import { apiClient } from './client';
import type { MockAnswerDto } from '@/shared/dto/mock.dto';
import type { GamificationSummary } from './gamification-types';

/**
 * Mock-test API client (Sprint 4). All endpoints are auth-gated and STUDENT-only.
 * Timing is server-authoritative - the client countdown is driven by `expiresAt`
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
  /** Sum of per-question marks. Server-computed (business value) - omitted by older backends. */
  totalMarks?: number;
}

export interface ApiMockOption {
  id: string;
  text: string;
  orderIndex: number;
}

/** Coding payload carried on a CODING-type mock question. */
export interface ApiMockCodingPayload {
  slug: string;
  statement: string;
  inputFormat: string | null;
  outputFormat: string | null;
  constraints: string | null;
  sampleInput: string | null;
  sampleOutput: string | null;
  starterCode: Record<string, string>;
  sampleCases: Array<{ input: string; expectedOutput: string }>;
  timeLimitMs: number;
}

export interface ApiMockQuestion {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  stem: string;
  imageUrl?: string | null;
  /** Root section name (e.g. "Numerical Ability"); "Coding" for coding items.
   *  Drives the per-section tabs in the runner. */
  section?: string | null;
  /** PYQ tag - company tag ids + years this question was asked in. */
  companyIds?: string[];
  yearTags?: number[];
  /** Question source; PATTERN_BASED (no company/year) → "SIMILAR PATTERN" tag. */
  source?: string | null;
  options: ApiMockOption[];
  coding?: ApiMockCodingPayload;
}

export interface ApiMockSavedAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface ApiMockSavedCoding {
  problemId: string;
  language: string | null;
  sourceCode: string | null;
  verdict: string | null;
  passed: number;
  total: number;
  isCorrect: boolean;
}

/** Result of a Judge0-graded coding submission (POST /mocks/attempts/:id/code). */
export interface ApiMockCodeResult {
  ok: boolean;
  error: string | null;
  verdict: string;
  passed: number;
  total: number;
  compileOutput: string | null;
  cases: Array<{
    index: number;
    hidden: boolean;
    passed: boolean;
    status: string;
    input: string | null;
    expectedOutput: string | null;
    actualOutput: string | null;
    stderr: string | null;
    timeSec: number | null;
  }>;
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
  savedCoding: ApiMockSavedCoding[];
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
  /** XP/streak/level deltas from this submission (present on the submit response). */
  gamification?: GamificationSummary | null;
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
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  stem: string;
  imageUrl?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  explanation: string | null;
  options: Array<{ id: string; text: string; orderIndex: number; isCorrect: boolean }>;
  correctOptionIds: string[];
  yourOptionIds: string[];
  isCorrect: boolean;
  coding?: {
    language: string | null;
    sourceCode: string | null;
    verdict: string | null;
    passed: number;
    total: number;
  } | null;
}

export interface ApiMockTopicBreakdown {
  topic: string;
  correct: number;
  total: number;
}

export interface ApiMockProctoring {
  proctored: boolean;
  tabSwitches: number;
  fullscreenExits: number;
  violations: number;
  snapshotCount: number;
  cameraGranted: boolean;
  micGranted: boolean;
}

export interface ApiMockReport extends ApiMockResult {
  title: string;
  passingScore: number;
  submittedAt: string | null;
  topicBreakdown: ApiMockTopicBreakdown[];
  questions: ApiMockReviewQuestion[];
  proctoring?: ApiMockProctoring | null;
  /** True when this attempt is the one-time calibration assessment (renders the recommendation-centric results). */
  isCalibration?: boolean;
}

export interface CreateCustomMockBody {
  sectionSlugs?: string[];
  topicSlugs?: string[];
  questionCount: number;
  durationMinutes: number;
  /** Coding topics (primary tags) to draw coding problems from. */
  codingTopics?: string[];
  codingCount?: number;
  title?: string;
}

/** What the builder actually assembled, versus what was asked for. */
export interface CustomMockCreated {
  mockId: string;
  mcqCount: number;
  codingCount: number;
  requestedMcq: number;
  requestedCoding: number;
}

/**
 * Build a self-serve Mock Assessment (Mode 3) and get its id to run proctored.
 *
 * Returns the REAL counts, not just the id. A custom mock can legitimately come up short -
 * thin topics, the seen-aware sampler skipping questions you've already answered, or a free
 * student's per-topic cap - and this used to return a bare `{ mockId }`, so asking for 20
 * and getting 2 dropped you into a 2-question mock with no explanation.
 */
export async function createCustomMock(body: CreateCustomMockBody): Promise<CustomMockCreated> {
  const res = await apiClient.post<CustomMockCreated>('/api/v1/mocks/custom', body);
  return res.data;
}

export interface CodingTopic {
  topic: string;
  count: number;
}

/** Distinct coding topics (primary tags) for the custom-mock builder. */
export async function listCodingTopics(company?: string): Promise<CodingTopic[]> {
  const url = company
    ? `/api/v1/mocks/coding-topics?company=${encodeURIComponent(company)}`
    : '/api/v1/mocks/coding-topics';
  const res = await apiClient.get<CodingTopic[]>(url);
  return res.data;
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

/** One live proctoring violation reported to the server-stamped log. */
export interface ProctorViolationReport {
  type: string;
  severity?: string;
  message?: string;
  confidence?: number;
  occurredAt?: string;
  /** Base64 JPEG data URL - high-severity events only. */
  snapshot?: string;
}

/** Live proctoring heartbeat + violation batch (fired ~10s while an attempt is open). */
export async function reportProctorBatch(
  attemptId: string,
  batch: { violations: ProctorViolationReport[] },
): Promise<{ ok: boolean }> {
  const res = await apiClient.post<{ ok: boolean }>(
    `/api/v1/mocks/attempts/${attemptId}/proctor`,
    batch,
  );
  return res.data;
}

/** Submit a coding solution for a coding problem inside a mock attempt (Judge0-graded). */
export async function submitMockCode(
  attemptId: string,
  body: { problemId: string; language: string; source: string },
): Promise<ApiMockCodeResult> {
  const res = await apiClient.post<ApiMockCodeResult>(
    `/api/v1/mocks/attempts/${attemptId}/code`,
    body,
  );
  return res.data;
}

export async function submitMock(
  attemptId: string,
  proctoring?: import('@/lib/proctoring/useProctoring').ProctoringSummary,
): Promise<ApiMockResult> {
  const res = await apiClient.post<ApiMockResult>(
    `/api/v1/mocks/attempts/${attemptId}/submit`,
    proctoring ? { proctoring } : {},
  );
  return res.data;
}

export async function getMockReport(attemptId: string): Promise<ApiMockReport> {
  const res = await apiClient.get<ApiMockReport>(`/api/v1/mocks/attempts/${attemptId}/report`);
  return res.data;
}

/**
 * The student's finalized attempts, newest first. `scope` separates the surfaces:
 * 'custom' = Mock Assessment history, 'assessment' = Main-Assessment history.
 */
export async function getMockHistory(
  scope: 'all' | 'custom' | 'assessment' = 'all',
): Promise<ApiMockAttemptHistory[]> {
  const url =
    scope === 'all' ? '/api/v1/mocks/attempts/mine' : `/api/v1/mocks/attempts/mine?scope=${scope}`;
  const res = await apiClient.get<ApiMockAttemptHistory[]>(url);
  return res.data;
}
