import { apiClient } from './client';
import type { ResumeData } from '@/components/resume/types';
import type {
  AtsAnalyzeResult,
  ResumeAiSection,
  TailorSectionResult,
} from '@/shared/dto/resume-ai.dto';

/** Resume AI client. Backend gates on OPENAI_API_KEY (503 when unconfigured). */

export async function aiStatus(): Promise<boolean> {
  try {
    return (await apiClient.get<{ available: boolean }>('/api/v1/me/resume-ai/status')).data.available;
  } catch {
    return false;
  }
}

export async function tailorSection(
  section: ResumeAiSection,
  resumeData: ResumeData,
  jobDescription: string,
): Promise<TailorSectionResult> {
  return (
    await apiClient.post<TailorSectionResult>('/api/v1/me/resume-ai/tailor-section', {
      section,
      resumeData: resumeData as unknown as Record<string, unknown>,
      jobDescription,
    })
  ).data;
}

export async function atsAnalyze(
  resumeData: ResumeData,
  jobDescription?: string,
): Promise<AtsAnalyzeResult> {
  return (
    await apiClient.post<AtsAnalyzeResult>('/api/v1/me/resume-ai/ats-analyze', {
      resumeData: resumeData as unknown as Record<string, unknown>,
      jobDescription,
    })
  ).data;
}
