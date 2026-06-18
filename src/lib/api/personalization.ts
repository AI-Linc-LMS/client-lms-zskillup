import { apiClient } from './client';

/** Mirrors the backend StudentBriefing (GET /students/briefing). */
export interface StudentBriefing {
  mode: 'new' | 'returning';
  greeting: string;
  headline: string;
  subline: string;
  focusAreas: Array<{ title: string; detail: string }>;
  nextAction: { label: string; kind: 'mock' | 'practice' | 'course' | 'explore'; href: string };
  stats: {
    totalXp: number;
    level: number;
    currentStreakDays: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
  };
  generatedByAi: boolean;
}

export async function getBriefing(): Promise<StudentBriefing> {
  const res = await apiClient.get<StudentBriefing>('/api/v1/students/briefing');
  return res.data;
}
