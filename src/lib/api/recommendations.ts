import { apiClient } from './client';
import type { RecommendationsResponseDto } from '@/shared/dto/recommendations.dto';
import type { CalibrationResultsDto } from '@/shared/dto/calibration.dto';

export type { RecommendationsResponseDto, RecommendationDto } from '@/shared/dto/recommendations.dto';
export type { CalibrationResultsDto, CalibrationSectionResultDto } from '@/shared/dto/calibration.dto';

/** CSV-driven dashboard recommendations for the signed-in student. */
export async function getMyRecommendations(): Promise<RecommendationsResponseDto> {
  return (await apiClient.get<RecommendationsResponseDto>('/api/v1/me/recommendations')).data;
}

/** Recommendation-centric calibration results (strengths, gaps, company fit, AI summary). */
export async function getCalibrationResults(): Promise<CalibrationResultsDto> {
  return (await apiClient.get<CalibrationResultsDto>('/api/v1/me/recommendations/results')).data;
}
