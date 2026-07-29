import { apiClient } from './client';
import type { PerformanceParticipationDto } from '@/shared/dto/me-analytics.dto';

export type {
  PerformanceParticipationDto,
  ScatterPoint,
  CohortOption,
  CompanyOption,
} from '@/shared/dto/me-analytics.dto';

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
/**
 * Honest headline counts. Do NOT derive these from `companies[]` - that array is
 * keyed off the many-to-many company tags (a question is tagged to ~2.8 companies),
 * so summing its `questionsAttempted` double-counts (~4.5x) and any shared tag makes
 * a company look "practised". The server computes these from single-valued sources.
 */
export interface ReadinessStats {
  /** True total practice attempts (no company-tag join). */
  questionsAttempted: number;
  /** Distinct sub-topics attempted (subtopic_id is single-valued). */
  topicsPractised: number;
  /** Companies the student DELIBERATELY practised (company-scoped sessions). */
  companiesPractised: number;
}

export interface Readiness {
  overall: { score: number; level: string; components: ReadinessComponent[] };
  companies: CompanyReadiness[];
  topics: TopicReadiness[];
  stats?: ReadinessStats;
}

export async function getReadiness(): Promise<Readiness> {
  const res = await apiClient.get<Readiness>('/api/v1/me/readiness');
  return res.data;
}

/**
 * Performance vs participation scatter - your dot among anonymized college peers.
 * B2B (college) callers may narrow peers to one cohort and/or one purchased company;
 * the response echoes the available cohorts/companies for the filter dropdowns.
 */
export async function getMyPerformanceScatter(opts?: {
  cohort?: string | null;
  company?: string | null;
}): Promise<PerformanceParticipationDto> {
  const qs = new URLSearchParams();
  if (opts?.cohort) qs.set('cohort', opts.cohort);
  if (opts?.company) qs.set('company', opts.company);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return (await apiClient.get<PerformanceParticipationDto>(`/api/v1/me/readiness/scatter${suffix}`))
    .data;
}
