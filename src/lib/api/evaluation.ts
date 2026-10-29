import { apiClient } from './client';

/** One attempt in the marking queue. */
export interface EvaluationQueueRow {
  attemptId: string;
  submittedAt: string | null;
  status: string;
  title: string;
  studentId: string;
  studentName: string | null;
  email: string;
  pendingCount: number;
  pendingMarks: number;
}

/** One subjective answer on the marking sheet. */
export interface EvaluationAnswer {
  answerId: string;
  questionId: string;
  stem: string;
  /** Marking guidance from the question author. ADMIN-ONLY — never shown to students. */
  answerGuidance: string | null;
  maxWords: number | null;
  textAnswer: string | null;
  wordCount: number;
  /** The paper's marks for this question — the ceiling. */
  marks: number;
  /** NULL = not yet evaluated. 0 is a real mark. */
  awardedMarks: number | null;
  feedback: string | null;
  evaluatedAt: string | null;
}

export interface EvaluationSheet {
  attemptId: string;
  student: { id: string; fullName: string | null; email: string };
  title: string;
  submittedAt: string | null;
  autoScore: number;
  total: number;
  pendingCount: number;
  answers: EvaluationAnswer[];
}

export async function getEvaluationQueue(params: { limit?: number; offset?: number } = {}): Promise<{
  rows: EvaluationQueueRow[];
  total: number;
}> {
  const q = new URLSearchParams();
  if (params.limit) q.set('limit', String(params.limit));
  if (params.offset) q.set('offset', String(params.offset));
  const res = await apiClient.get<{ rows: EvaluationQueueRow[]; total: number }>(
    `/api/v1/admin/mocks/evaluation/queue${q.toString() ? `?${q}` : ''}`,
  );
  return res.data;
}

export async function getEvaluationSheet(attemptId: string): Promise<EvaluationSheet> {
  const res = await apiClient.get<EvaluationSheet>(
    `/api/v1/admin/mocks/evaluation/attempts/${attemptId}`,
  );
  return res.data;
}

/** Award marks for one answer. Returns the attempt's re-derived score. */
export async function evaluateAnswer(
  answerId: string,
  body: { awardedMarks: number; feedback?: string },
): Promise<{ attemptId: string; score: number; total: number; pendingCount: number }> {
  const res = await apiClient.post<{
    attemptId: string;
    score: number;
    total: number;
    pendingCount: number;
  }>(`/api/v1/admin/mocks/evaluation/answers/${answerId}`, body);
  return res.data;
}
