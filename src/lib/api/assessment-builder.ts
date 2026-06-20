import { apiClient } from './client';

/** AI Linc-style assessment builder (MCQ v1). Mirrors backend assessment-builder.dto.ts. */
export interface BuilderSection {
  name: string;
  topicIds: string[];
  numQuestions: number;
  marksPerQuestion?: number;
  durationMinutes?: number;
}

export interface AssessmentPreview {
  sections: Array<{
    name: string;
    requested: number;
    available: number;
    picked: number;
    shortfall: number;
    sample: string[];
  }>;
  totalQuestions: number;
}

export interface CreateAssessmentPayload {
  companyId: string;
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  proctored?: boolean;
  passingScore?: number;
  sections: BuilderSection[];
}

export interface CreatedAssessment {
  mockTestId: string;
  scheduledAssessmentId: string;
  totalQuestions: number;
  companyName: string;
}

export async function previewAssessment(sections: BuilderSection[]): Promise<AssessmentPreview> {
  const res = await apiClient.post<AssessmentPreview>('/api/v1/admin/assessment-builder/preview', {
    sections,
  });
  return res.data;
}

export async function createAssessment(payload: CreateAssessmentPayload): Promise<CreatedAssessment> {
  const res = await apiClient.post<CreatedAssessment>(
    '/api/v1/admin/assessment-builder/create',
    payload,
  );
  return res.data;
}
