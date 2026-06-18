import { apiClient } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdaptiveOption {
  id: string;
  text: string;
  orderIndex: number;
}

export interface AdaptivePendingQuestion {
  questionId: string;
  stem: string;
  options: AdaptiveOption[];
  targetSkill: string;
  difficultyLabel: 'EASY' | 'MEDIUM' | 'HARD';
  selectorRationale: string;
  predictedPCorrect: number;
  hintTokensRemaining: number;
}

export interface AdaptiveSessionStart {
  sessionId: string;
  mockTestId: string;
  title: string;
  minQuestions: number;
  maxQuestions: number;
  confidencePromptEnabled: boolean;
  hintTokens: number;
  firstQuestion: AdaptivePendingQuestion;
}

export interface SkillDelta {
  before: number;
  after: number;
  se: number;
}

export interface AdaptiveAnswerResult {
  isCorrect: boolean;
  thetaDelta: Record<string, SkillDelta>;
  nextQuestion: AdaptivePendingQuestion | null;
  sessionComplete: boolean;
  progress: {
    answered: number;
    minQuestions: number;
    maxQuestions: number;
    avgSe: number;
  };
  abilityState: Record<string, number>;
  seState: Record<string, number>;
}

export interface SkillMastery {
  skill: string;
  theta: number;
  se: number;
  masteryPct: number;
  deltaPct: number | null;
  band: 'emerging' | 'developing' | 'proficient' | 'mastered';
}

export interface AdaptiveQuestionRecord {
  index: number;
  questionId: string;
  stem: string;
  difficulty: string;
  targetSkill: string;
  isCorrect: boolean;
  selectedOption: string;
  correctOption: string;
  explanation: string;
  confidence: number | null;
  timeMs: number | null;
  thetaAfter: Record<string, number>;
}

export interface AdaptiveResults {
  sessionId: string;
  mockTestId: string;
  status: string;
  correct: number;
  total: number;
  accuracy: number;
  skillMastery: SkillMastery[];
  questions: AdaptiveQuestionRecord[];
  abilityState: Record<string, number>;
  seState: Record<string, number>;
  aiNarration: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AdaptiveHint {
  teaser: string;
  hint: string;
  hintsRemaining: number;
}

export interface AdaptiveSessionSummary {
  sessionId: string;
  mockTestId: string;
  status: string;
  questionCount: number;
  startedAt: string;
  completedAt: string | null;
}

// Narration section types
export interface NarrationHeadline {
  headline: string;
  score_summary: { correct: number; total: number; accuracy: number };
  skill_mastery: SkillMastery[];
}

export interface NarrationPerQuestion {
  per_question: Array<{
    index: number;
    rationale: string;
    correct_concept: string;
    your_mistake: string | null;
    diagram_suggestion: string | null;
  }>;
}

export interface NarrationMisconceptions {
  misconceptions: Array<{
    title: string;
    evidence_question_indices: number[];
    explanation: string;
    fix: string;
  }>;
}

export interface NarrationRemediationPath {
  remediation_path: Array<{
    step: 1 | 2 | 3;
    title: string;
    why: string;
    action_kind: 'practice' | 'read' | 'watch';
    target_skill: string;
    est_minutes: number;
  }>;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export async function startAdaptiveSession(mockTestId: string): Promise<AdaptiveSessionStart> {
  const res = await apiClient.post<AdaptiveSessionStart>('/api/v1/adaptive-mocks/sessions/start', {
    mockTestId,
  });
  return res.data;
}

export async function submitAdaptiveAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionId: string,
  confidence?: number,
  timeMs?: number,
): Promise<AdaptiveAnswerResult> {
  const res = await apiClient.post<AdaptiveAnswerResult>(
    `/api/v1/adaptive-mocks/sessions/${sessionId}/answer`,
    { questionId, selectedOptionId, confidence, timeMs },
  );
  return res.data;
}

export async function requestHint(sessionId: string): Promise<AdaptiveHint> {
  const res = await apiClient.post<AdaptiveHint>(
    `/api/v1/adaptive-mocks/sessions/${sessionId}/hint`,
    {},
  );
  return res.data;
}

export async function abandonSession(sessionId: string): Promise<void> {
  await apiClient.post(`/api/v1/adaptive-mocks/sessions/${sessionId}/abandon`, {});
}

export async function getAdaptiveResults(sessionId: string): Promise<AdaptiveResults> {
  const res = await apiClient.get<AdaptiveResults>(
    `/api/v1/adaptive-mocks/sessions/${sessionId}/results`,
  );
  return res.data;
}

export async function getNarrationSection(
  sessionId: string,
  section: 'headline' | 'per_question' | 'misconceptions' | 'remediation_path',
): Promise<Record<string, unknown>> {
  const res = await apiClient.post<Record<string, unknown>>(
    `/api/v1/adaptive-mocks/sessions/${sessionId}/narration/${section}`,
    {},
  );
  return res.data;
}

export async function listAdaptiveSessions(): Promise<AdaptiveSessionSummary[]> {
  const res = await apiClient.get<AdaptiveSessionSummary[]>('/api/v1/adaptive-mocks/sessions');
  return res.data;
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export interface AdminAdaptiveSession {
  sessionId: string;
  userId: string;
  mockTestId: string;
  mockTitle: string;
  status: string;
  questionCount: number;
  hintsUsed: number;
  abilityState: Record<string, number>;
  seState: Record<string, number>;
  startedAt: string;
  completedAt: string | null;
  correct: number;
  total: number;
  accuracy: number;
  skillMastery: SkillMastery[];
}

export async function adminListAdaptiveSessions(): Promise<AdminAdaptiveSession[]> {
  const res = await apiClient.get<AdminAdaptiveSession[]>('/api/v1/admin/adaptive-mocks/sessions');
  return res.data;
}

export async function adminGetAdaptiveSession(sessionId: string): Promise<AdaptiveResults & { userId: string }> {
  const res = await apiClient.get<AdaptiveResults & { userId: string }>(
    `/api/v1/admin/adaptive-mocks/sessions/${sessionId}`,
  );
  return res.data;
}
