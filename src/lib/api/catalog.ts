import { apiClient } from './client';

/**
 * Catalog API client - public reads for companies + courses (Sprint 3).
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
  // Card metadata (explorer grid / hub hero) - DB-backed, was demo-data.
  rating: number | null;
  enrolled: string | null;
  package: string | null;
  difficulty: string | null;
  mcqs: string | null;
  rounds: number | null;
  // REAL live counts from the question/coding banks (not seeded marketing copy).
  questionCount?: number;
  pyqCount?: number;
  codingCount?: number;
}

/** The 7-tab hub body + quick stats (mirrors backend CompanyHubContentDto). */
export interface ApiCompanyHubContent {
  overview: {
    summary: string;
    process: { stage: string; detail: string }[];
    topicGrid: { group: string; topics: string[] }[];
    /** Raw admin-set intro-video link (edited in the admin hub editor). */
    introVideoUrl?: string | null;
  };
  /** Ready-to-embed intro-video player URL (server-derived from overview.introVideoUrl). */
  introEmbedUrl?: string | null;
  quickStats: {
    rounds: number;
    examType: string;
    negativeMarking: string;
    applicants: string;
    readiness: string;
    openRoles: string;
  };
  syllabus: { round: string; info: string; type: 'Elimination' | 'Final' }[];
  material: { topic: string; videos: number; locked: boolean }[];
  quizzes: { title: string; questions: number; locked: boolean }[];
  mocks: { title: string; questions: number; minutes: number; kind: 'mock' | 'contest'; locked: boolean }[];
  formulaSheets: { topic: string; locked: boolean }[];
  interviews: { role: string; year: string; rounds: number; verdict: 'Selected' | 'Rejected'; excerpt: string }[];
}

/** A company Overview video — unlocked, inline, shown on the hub Overview tab. */
export interface ApiOverviewVideo {
  id: string;
  title: string;
  embedUrl: string | null;
  durationLabel?: string | null;
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
  hub: ApiCompanyHubContent | null;
  overviewVideos?: ApiOverviewVideo[];
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
 * All catalog reads are `auth: 'public'` posture (CLAUDE.md §3 - the prepare
 * catalog, homepage, and company hubs are all guest-accessible). This prevents
 * a logged-out visitor from triggering the silent-refresh + /login redirect
 * cycle on first page load - the bug surfaced in the QA audit on /prepare.
 */
export async function listCompanies(): Promise<ApiCompany[]> {
  const res = await apiClient.get<ApiCompany[]>('/api/v1/companies', { auth: 'public' });
  return res.data;
}

export async function getCompany(slug: string): Promise<ApiCompanyHub> {
  const res = await apiClient.get<ApiCompanyHub>(`/api/v1/companies/${slug}`, { auth: 'public' });
  return res.data;
}

/** Aggregated prep stats for a company hub: topics (w/ counts), years, roles. */
export interface ApiCompanyPrep {
  topics: Array<{ slug: string; name: string; parentId: string | null; count: number; pyqCount: number }>;
  years: Array<{ year: number; count: number }>;
  roles: string[];
  totals: { total: number; verified: number; pyq: number };
}

export interface ApiCompanyPyq {
  id: string;
  stem: string;
  imageUrl?: string | null;
  difficulty: string;
  solution: string | null;
  hint: string | null;
  yearTags: number[] | null;
  sourceRef: string | null;
  topicName: string;
  options: Array<{ text: string; isCorrect: boolean; orderIndex: number }>;
}

/** PYQ list result - metered: a non-entitled student gets `items` (the first
 *  `freeLimit`) with `lockedCount` more behind the paywall. */
export interface ApiCompanyPyqsResult {
  items: ApiCompanyPyq[];
  total: number;
  lockedCount: number;
  freeLimit: number;
  paywall: { scope: 'COMPANY' | 'PLATFORM'; scopeRef: string | null } | null;
}

/** A company's PYQs for a topic (or all topics). Requires auth (answers are
 *  gated); non-entitled students see the first few with the rest locked. */
export async function getCompanyPyqs(slug: string, topicSlug?: string): Promise<ApiCompanyPyqsResult> {
  const qs = topicSlug ? `?topic=${encodeURIComponent(topicSlug)}` : '';
  const res = await apiClient.get<ApiCompanyPyqsResult>(`/api/v1/companies/${slug}/pyqs${qs}`);
  return res.data;
}

export async function getCompanyPrep(slug: string): Promise<ApiCompanyPrep> {
  const res = await apiClient.get<ApiCompanyPrep>(`/api/v1/companies/${slug}/prep`, {
    auth: 'public',
  });
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
  /** PUBLISHED-question count - only present from listTopicsWithCounts(). */
  questionCount?: number;
}

export async function listTopics(): Promise<ApiTopic[]> {
  const res = await apiClient.get<ApiTopic[]>('/api/v1/topics', { auth: 'public' });
  return res.data;
}

/** Topics with their live question-bank counts (subtopics = direct, parents = rolled up). */
export async function listTopicsWithCounts(): Promise<ApiTopic[]> {
  const res = await apiClient.get<ApiTopic[]>('/api/v1/topics/with-counts', { auth: 'public' });
  return res.data;
}

/**
 * A company's WhatsApp community link. The ENDPOINT requires auth on purpose: the
 * public company list is anonymous, and putting invite links there would let a
 * scraper harvest every community in one request. Null = none configured.
 *
 * Uses the DEFAULT client posture deliberately. The 'public' posture skips the
 * pre-flight silent refresh, and the access token lives in memory only - so on a
 * fresh page load a signed-in student has no token yet, the request 401s, and the
 * CTA never appears for anyone. The caller guards the anonymous case instead, by
 * not issuing the request at all without a role hint, which is what keeps a
 * signed-out visitor on the publicly-browsable hub from being bounced to /login.
 */
export async function getCompanyCommunity(
  slug: string,
): Promise<{ whatsappCommunityUrl: string | null }> {
  const res = await apiClient.get<{ whatsappCommunityUrl: string | null }>(
    `/api/v1/companies/${encodeURIComponent(slug)}/community`,
  );
  return res.data;
}
