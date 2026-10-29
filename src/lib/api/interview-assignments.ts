import { apiClient } from './client';

/** Audience rule types — mirrors the shared JobTargetType enum. */
export type InterviewTargetType = 'USER' | 'COHORT' | 'COLLEGE' | 'COMPANY' | 'BATCH' | 'BRANCH';

export interface InterviewTarget {
  id?: string;
  targetType: InterviewTargetType;
  /** Row-typed targets (USER/COHORT/COLLEGE/COMPANY). */
  targetId?: string | null;
  /** Value-typed targets (BATCH = passout year, BRANCH). */
  targetValue?: string | null;
  isExclusion?: boolean;
}

export interface InterviewAssignmentRow {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  interviewType: string;
  durationMinutes: number;
  maxTurns: number;
  instructions: string | null;
  dueAt: string | null;
  isPublished: boolean;
  collegeId: string | null;
  createdAt: string;
  targetRules: number;
  started: number;
  completed: number;
}

export interface InterviewAssignmentDetail
  extends Omit<InterviewAssignmentRow, 'targetRules' | 'started' | 'completed' | 'collegeId'> {
  targets: InterviewTarget[];
  /** How many students the audience rules actually reach. */
  reach: number;
}

export interface InterviewAssignmentResult {
  interviewId: string;
  status: string;
  startedAt: string | null;
  submittedAt: string | null;
  overallPct: number | null;
  gradedBy: string | null;
  studentId: string;
  studentName: string | null;
  email: string;
}

export interface AssignmentPayload {
  title: string;
  topic: string;
  difficulty?: string;
  interviewType?: string;
  durationMinutes?: number;
  maxTurns?: number;
  instructions?: string | null;
  dueAt?: string | null;
  isPublished?: boolean;
  /** Sent whole — replaces the existing list. Omit to leave targets alone. */
  targets?: InterviewTarget[];
}

const BASE = '/api/v1/admin/interview-assignments';

export async function listInterviewAssignments(): Promise<InterviewAssignmentRow[]> {
  return (await apiClient.get<InterviewAssignmentRow[]>(BASE)).data;
}

export async function getInterviewAssignment(id: string): Promise<InterviewAssignmentDetail> {
  return (await apiClient.get<InterviewAssignmentDetail>(`${BASE}/${id}`)).data;
}

export async function createInterviewAssignment(
  dto: AssignmentPayload,
): Promise<{ id: string }> {
  return (await apiClient.post<{ id: string }>(BASE, dto)).data;
}

export async function updateInterviewAssignment(
  id: string,
  dto: Partial<AssignmentPayload>,
): Promise<void> {
  await apiClient.patch(`${BASE}/${id}`, dto);
}

export async function deleteInterviewAssignment(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export async function getInterviewAssignmentResults(
  id: string,
): Promise<InterviewAssignmentResult[]> {
  return (await apiClient.get<InterviewAssignmentResult[]>(`${BASE}/${id}/results`)).data;
}

/* ── Student side ──────────────────────────────────────────────────────────── */

export interface AssignedInterview {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  interviewType: string;
  durationMinutes: number;
  maxTurns: number;
  instructions: string | null;
  dueAt: string | null;
  /** The student's own attempt, if they have started it. */
  interviewId: string | null;
  attemptStatus: string | null;
  overallPct: number | null;
}

export async function getAssignedInterviews(): Promise<AssignedInterview[]> {
  return (await apiClient.get<AssignedInterview[]>('/api/v1/me/mock-interviews/assigned')).data;
}

/** Begin an assigned interview. Config comes from the assignment, not the caller. */
export async function startAssignedInterview(assignmentId: string): Promise<{ id: string }> {
  return (
    await apiClient.post<{ id: string }>(
      `/api/v1/me/mock-interviews/assigned/${assignmentId}/start`,
      {},
    )
  ).data;
}
