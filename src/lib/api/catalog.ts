import { apiClient } from './client';

/**
 * Catalog API client — public reads for companies + courses (Sprint 3).
 * Mirrors the backend `CompanyDto` / `CompanyHubDto` / `CourseSummaryDto`
 * shapes. Will be replaced by generated openapi-typescript types when CI
 * generation lands.
 */

export interface ApiCompany {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  type: 'SERVICE' | 'CONSULTING' | 'PRODUCT';
  logoUrl: string | null;
  brandColor: string | null;
  accent: string | null;
  description: string | null;
  badge: string | null;
}

export interface ApiCompanyHub extends ApiCompany {
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    category: string;
    difficulty: string;
    estimatedHours: number;
  }>;
}

export interface ApiCourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  category: string;
  difficulty: string;
  estimatedHours: number;
}

export interface ApiLesson {
  id: string;
  title: string;
  kind: 'VIDEO' | 'TEXT' | 'CONCEPT_REEL';
  durationMinutes: number;
  isFree: boolean;
  orderIndex: number;
}

export interface ApiModule {
  id: string;
  title: string;
  summary: string | null;
  orderIndex: number;
  lessons: ApiLesson[];
}

export interface ApiCourseDetail extends ApiCourseSummary {
  modules: ApiModule[];
}

/**
 * All catalog reads are `auth: 'public'` posture (CLAUDE.md §3 — the prepare
 * catalog, homepage, and company hubs are all guest-accessible). This prevents
 * a logged-out visitor from triggering the silent-refresh + /login redirect
 * cycle on first page load — the bug surfaced in the QA audit on /prepare.
 */
export async function listCompanies(): Promise<ApiCompany[]> {
  const res = await apiClient.get<ApiCompany[]>('/api/v1/companies', { auth: 'public' });
  return res.data;
}

export async function getCompany(slug: string): Promise<ApiCompanyHub> {
  const res = await apiClient.get<ApiCompanyHub>(`/api/v1/companies/${slug}`, { auth: 'public' });
  return res.data;
}

export async function listCourses(filters: {
  category?: string;
  difficulty?: string;
  companyId?: string;
} = {}): Promise<ApiCourseSummary[]> {
  const qs = new URLSearchParams();
  if (filters.category) qs.set('category', filters.category);
  if (filters.difficulty) qs.set('difficulty', filters.difficulty);
  if (filters.companyId) qs.set('companyId', filters.companyId);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<ApiCourseSummary[]>(`/api/v1/courses${suffix}`, {
    auth: 'public',
  });
  return res.data;
}

export async function getCourse(slug: string): Promise<ApiCourseDetail> {
  const res = await apiClient.get<ApiCourseDetail>(`/api/v1/courses/${slug}`, { auth: 'public' });
  return res.data;
}

export interface ApiTopic {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

export async function listTopics(): Promise<ApiTopic[]> {
  const res = await apiClient.get<ApiTopic[]>('/api/v1/topics', { auth: 'public' });
  return res.data;
}
