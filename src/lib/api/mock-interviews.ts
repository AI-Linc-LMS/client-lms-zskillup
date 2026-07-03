import { apiClient } from './client';
import type {
  CreateMockInterviewDto,
  InterviewTurnDto,
  MockInterviewDetailDto,
  MockInterviewSummaryDto,
} from '@/shared/dto/mock-interview.dto';

/** Mock Interview API client. Owner-scoped (@CurrentUser). */

export async function aiInterviewStatus(): Promise<boolean> {
  try {
    return (await apiClient.get<{ available: boolean }>('/api/v1/me/mock-interviews/ai-status')).data
      .available;
  } catch {
    return false;
  }
}

export async function listInterviews(): Promise<MockInterviewSummaryDto[]> {
  return (await apiClient.get<MockInterviewSummaryDto[]>('/api/v1/me/mock-interviews')).data;
}

export async function createInterview(dto: CreateMockInterviewDto): Promise<MockInterviewDetailDto> {
  return (await apiClient.post<MockInterviewDetailDto>('/api/v1/me/mock-interviews', dto)).data;
}

export async function getInterview(id: string): Promise<MockInterviewDetailDto> {
  return (await apiClient.get<MockInterviewDetailDto>(`/api/v1/me/mock-interviews/${id}`)).data;
}

export async function startInterview(id: string): Promise<InterviewTurnDto> {
  return (await apiClient.post<InterviewTurnDto>(`/api/v1/me/mock-interviews/${id}/start`, {})).data;
}

export async function nextInterviewQuestion(
  id: string,
  previousQuestionId: number,
  answer: string,
): Promise<InterviewTurnDto> {
  return (
    await apiClient.post<InterviewTurnDto>(`/api/v1/me/mock-interviews/${id}/next`, {
      previousQuestionId,
      answer,
    })
  ).data;
}

export async function submitInterview(
  id: string,
  responses: { questionId: number; answer: string }[],
): Promise<MockInterviewDetailDto> {
  return (
    await apiClient.post<MockInterviewDetailDto>(`/api/v1/me/mock-interviews/${id}/submit`, {
      responses,
    })
  ).data;
}

export async function abandonInterview(id: string): Promise<void> {
  await apiClient.post(`/api/v1/me/mock-interviews/${id}/abandon`, {});
}

export async function deleteInterview(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/me/mock-interviews/${id}`);
}
