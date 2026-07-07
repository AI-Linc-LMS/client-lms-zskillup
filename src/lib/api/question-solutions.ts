import { apiClient } from './client';
import type { QuestionSolutionDto } from '@/shared/dto/question-solutions.dto';

export type { QuestionSolutionDto } from '@/shared/dto/question-solutions.dto';

/** Detailed + shortcut solution (AI-enriched, platform-cached) for a question. */
export async function getQuestionSolution(questionId: string): Promise<QuestionSolutionDto> {
  return (await apiClient.get<QuestionSolutionDto>(`/api/v1/questions/${questionId}/solution`)).data;
}
