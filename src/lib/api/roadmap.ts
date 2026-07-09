import { apiClient } from './client';
import type {
  StudyDayDto,
  StudyPlanOverviewDto,
  StudyTaskToggleResultDto,
} from '@/shared/dto/study-plan.dto';

export type {
  StudyPlanOverviewDto,
  StudyPlanSummaryDto,
  StudyDayDto,
  StudyDayNodeDto,
  StudyTaskDto,
  StudyTaskToggleResultDto,
  StudyPhase,
  StudyTaskKind,
  StudyDayStatus,
  StudyPhaseMetaDto,
} from '@/shared/dto/study-plan.dto';

/** The whole roadmap: summary + today's day + all 90 day-nodes. */
export async function getRoadmap(): Promise<StudyPlanOverviewDto> {
  return (await apiClient.get<StudyPlanOverviewDto>('/api/v1/me/study-plan/overview')).data;
}

/** Generate the fixed 90-day roadmap from calibration (idempotent). */
export async function generateRoadmap(): Promise<StudyPlanOverviewDto> {
  return (await apiClient.post<StudyPlanOverviewDto>('/api/v1/me/study-plan/generate', {})).data;
}

/** One day's detail (throws PAYWALL/DAY_LOCKED-style error if still locked). */
export async function getRoadmapDay(n: number): Promise<StudyDayDto> {
  return (await apiClient.get<StudyDayDto>(`/api/v1/me/study-plan/day/${n}`)).data;
}

/** Mark a task done / undone. */
export async function toggleRoadmapTask(
  n: number,
  i: number,
  done: boolean,
): Promise<StudyTaskToggleResultDto> {
  return (
    await apiClient.post<StudyTaskToggleResultDto>(`/api/v1/me/study-plan/day/${n}/task/${i}`, { done })
  ).data;
}
