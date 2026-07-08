import { apiClient } from './client';
import type { RecommendationsResponseDto } from '@/shared/dto/recommendations.dto';

export type { RecommendationsResponseDto, RecommendationDto } from '@/shared/dto/recommendations.dto';

/** CSV-driven dashboard recommendations for the signed-in student. */
export async function getMyRecommendations(): Promise<RecommendationsResponseDto> {
  return (await apiClient.get<RecommendationsResponseDto>('/api/v1/me/recommendations')).data;
}
