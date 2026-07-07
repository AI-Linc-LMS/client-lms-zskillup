import { apiClient } from './client';
import type { PerformanceParticipationDto } from '@/shared/dto/me-analytics.dto';

export type { PerformanceParticipationDto, ScatterPoint } from '@/shared/dto/me-analytics.dto';

export interface ReadinessComponent {
  label: string;
  score: number;
  active: boolean;
}
export interface CompanyReadiness {
  slug: string;
  name: string;
  readiness: number;
  level: string;
  questionsAttempted: number;
  questionAccuracy: number;
  codingSolved: number;
  codingTotal: number;
}
export interface TopicReadiness {
  topic: string;
  slug: string;
  accuracy: number;
  attempts: number;
  level: string;
}
export interface Readiness {
  overall: { score: number; level: string; components: ReadinessComponent[] };
  companies: CompanyReadiness[];
  topics: TopicReadiness[];
}

export async function getReadiness(): Promise<Readiness> {
  const res = await apiClient.get<Readiness>('/api/v1/me/readiness');
  return res.data;
}

/** Performance vs participation scatter — your dot among anonymized college peers. */
export async function getMyPerformanceScatter(): Promise<PerformanceParticipationDto> {
  return (await apiClient.get<PerformanceParticipationDto>('/api/v1/me/readiness/scatter')).data;
}
