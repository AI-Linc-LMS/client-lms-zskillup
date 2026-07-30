import { apiClient } from './client';
import type { QuestionSolutionDto } from '@/shared/dto/question-solutions.dto';

export type { QuestionSolutionDto } from '@/shared/dto/question-solutions.dto';

/** Detailed + shortcut solution (AI-enriched, platform-cached) for a question. */
export async function getQuestionSolution(questionId: string): Promise<QuestionSolutionDto> {
  return (await apiClient.get<QuestionSolutionDto>(`/api/v1/questions/${questionId}/solution`)).data;
}

export interface ConceptVideoDto {
  url: string | null;
  title: string | null;
  status: 'COMING_SOON' | 'AVAILABLE';
}

/**
 * This question's topic concept video — answer-SAFE (no solution text), so it can
 * be fetched BEFORE the student submits (the concept-video modal opens pre-submit).
 */
export async function getConceptVideo(questionId: string): Promise<ConceptVideoDto> {
  return (await apiClient.get<ConceptVideoDto>(`/api/v1/questions/${questionId}/concept-video`)).data;
}
