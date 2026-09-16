import { apiClient } from './client';
import type { RecommendationsResponseDto } from '@/shared/dto/recommendations.dto';
import type { CalibrationResultsDto, CalibrationSectionResultDto } from '@/shared/dto/calibration.dto';
import { CODING_SECTION_LABEL } from '@/shared/question-taxonomy';

export type { RecommendationsResponseDto, RecommendationDto } from '@/shared/dto/recommendations.dto';
export type { CalibrationResultsDto, CalibrationSectionResultDto } from '@/shared/dto/calibration.dto';

/** CSV-driven dashboard recommendations for the signed-in student. */
export async function getMyRecommendations(): Promise<RecommendationsResponseDto> {
  return (await apiClient.get<RecommendationsResponseDto>('/api/v1/me/recommendations')).data;
}

/** Recommendation-centric calibration results (strengths, gaps, company fit, AI summary). */
export async function getCalibrationResults(): Promise<CalibrationResultsDto> {
  return withCodingSectionLabel(
    (await apiClient.get<CalibrationResultsDto>('/api/v1/me/recommendations/results')).data,
  );
}

/** The API labels the coding section 'Coding' (key `coding`); every screen shows it by its
 *  section name, CODING_SECTION_LABEL. */
function withCodingSectionLabel(d: CalibrationResultsDto): CalibrationResultsDto {
  const relabel = (s: CalibrationSectionResultDto) =>
    s.key === 'coding' ? { ...s, label: CODING_SECTION_LABEL } : s;
  return { ...d, sections: d.sections.map(relabel), strengths: d.strengths.map(relabel), gaps: d.gaps.map(relabel) };
}
