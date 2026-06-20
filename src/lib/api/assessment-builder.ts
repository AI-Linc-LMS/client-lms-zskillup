import { apiClient } from './client';

/** AI-assisted assessment builder. Mirrors backend assessment-builder.dto.ts. */
export type AssessmentItemType = 'MCQ' | 'CODING';

export interface BuilderSection {
  name: string;
  questionIds?: string[];
  codingProblemIds?: string[];
  topicIds?: string[];
  numQuestions?: number;
  marksPerQuestion?: number;
  durationMinutes?: number;
}

export interface CreateAssessmentPayload {
  companyId: string;
  title: string;
  scheduledAt: string;
  endsAt?: string;
  durationMinutes?: number;
  proctored?: boolean;
  passingScore?: number;
  sections: BuilderSection[];
}

export interface CreatedAssessment {
  mockTestId: string;
  scheduledAssessmentId: string;
  totalQuestions: number;
  mcqCount: number;
  codingCount: number;
  companyName: string;
}

/** Result of resolving a topic: bank items + how many to AI-generate. */
export interface SourcedTopic {
  topicId: string;
  topicName: string;
  type: AssessmentItemType;
  fromBank: Array<{ id: string; label: string }>;
  toGenerate: number;
  aiAvailable: boolean;
}

export interface GeneratedItem {
  id: string;
  label: string;
  type: string;
}

/** Resolve a free-text topic + count → bank items + shortfall to generate. */
export async function sourceTopic(
  topic: string,
  type: AssessmentItemType,
  count: number,
): Promise<SourcedTopic> {
  const res = await apiClient.post<SourcedTopic>('/api/v1/admin/assessment-builder/source', {
    topic,
    type,
    count,
  });
  return res.data;
}

/** Generate ONE AI item for a resolved topic (call in a loop for the live modal). */
export async function generateOne(body: {
  topicId: string;
  topicName: string;
  type: AssessmentItemType;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  avoid?: string[];
}): Promise<GeneratedItem> {
  const res = await apiClient.post<GeneratedItem>(
    '/api/v1/admin/assessment-builder/generate-one',
    body,
  );
  return res.data;
}

export async function createAssessment(payload: CreateAssessmentPayload): Promise<CreatedAssessment> {
  const res = await apiClient.post<CreatedAssessment>(
    '/api/v1/admin/assessment-builder/create',
    payload,
  );
  return res.data;
}
