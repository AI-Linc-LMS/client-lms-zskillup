import { apiClient } from './client';
import type { AdminCapabilities } from '@/shared/admin-capabilities';

// ─── User management (super-admin) ──────────────────────────────────────────

export type AdminRole = 'STUDENT' | 'COLLEGE_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
export type AdminUserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  status: AdminUserStatus;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  capabilities: AdminCapabilities;
  createdAt: string;
}

/** Richer projection returned by the single-user endpoints (detail drawer). */
export interface AdminUserDetail {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  status: AdminUserStatus;
  isEmailVerified: boolean;
  collegeId: string | null;
  cohortId: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  capabilities: AdminCapabilities;
}

export interface AdminLoginHistoryRow {
  id: string;
  at: string;
  method: string | null;
  ip: string | null;
  userAgent: string | null;
}

export async function listAdminUsers(params: {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.role) qs.set('role', params.role);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<{ rows: AdminUserRow[]; total: number }>(
    `/api/v1/admin/users${suffix}`,
  );
  return res.data;
}

export async function updateAdminUserRole(
  id: string,
  role: AdminRole,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/users/${id}/role`, { role });
  return res.data;
}

// ─── Account operations (super-admin) ───────────────────────────────────────

export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const res = await apiClient.get<AdminUserDetail>(`/api/v1/admin/users/${id}`);
  return res.data;
}

export async function updateAdminUser(
  id: string,
  patch: { fullName?: string | null; collegeId?: string | null; cohortId?: string | null },
): Promise<AdminUserDetail> {
  const res = await apiClient.patch<AdminUserDetail>(`/api/v1/admin/users/${id}`, patch);
  return res.data;
}

export async function suspendAdminUser(id: string): Promise<AdminUserDetail> {
  const res = await apiClient.post<AdminUserDetail>(`/api/v1/admin/users/${id}/suspend`, {});
  return res.data;
}

export async function activateAdminUser(id: string): Promise<AdminUserDetail> {
  const res = await apiClient.post<AdminUserDetail>(`/api/v1/admin/users/${id}/activate`, {});
  return res.data;
}

export async function verifyAdminUserEmail(id: string): Promise<AdminUserDetail> {
  const res = await apiClient.post<AdminUserDetail>(`/api/v1/admin/users/${id}/verify-email`, {});
  return res.data;
}

export async function sendAdminUserResetLink(id: string): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    `/api/v1/admin/users/${id}/send-reset-link`,
    {},
  );
  return res.data;
}

export async function getAdminUserLoginHistory(
  id: string,
  limit = 50,
): Promise<AdminLoginHistoryRow[]> {
  const res = await apiClient.get<AdminLoginHistoryRow[]>(
    `/api/v1/admin/users/${id}/login-history?limit=${limit}`,
  );
  return res.data;
}

export async function updateAdminUserCapabilities(
  id: string,
  flags: Partial<AdminCapabilities>,
): Promise<AdminUserDetail> {
  const res = await apiClient.patch<AdminUserDetail>(
    `/api/v1/admin/users/${id}/capabilities`,
    flags,
  );
  return res.data;
}

export async function deleteAdminStudent(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/students/${id}`);
}
import type {
  AdminCreateCollegeDto,
  AdminUpdateCollegeDto,
  AdminCreateCompanyDto,
  AdminUpdateCompanyDto,
  AdminCreateCourseDto,
  AdminUpdateCourseDto,
  AdminCreateModuleDto,
  AdminUpdateModuleDto,
  AdminCreateLessonDto,
  AdminUpdateLessonDto,
  CourseCategory,
  CourseDifficulty,
  LessonKind,
} from '@/shared';
import type {
  AdminCreateQuestionDto,
  AdminUpdateQuestionDto,
} from '@/shared/dto/admin-questions.dto';

/**
 * Admin (super-admin) API client. Wraps the `/api/v1/admin/*` endpoints.
 * All routes are SUPER_ADMIN-only — backend RolesGuard enforces; this client
 * is just transport. Day 3.5 brings up the colleges console first; other
 * admin entities (companies, courses, questions) will fold into this file
 * as their consoles are built (Sprint 8 polish).
 */

export interface AdminCollegeRow {
  id: string;
  name: string;
  slug: string;
  state: string;
  city: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export async function listAdminColleges(): Promise<AdminCollegeRow[]> {
  const res = await apiClient.get<AdminCollegeRow[]>('/api/v1/admin/colleges');
  return res.data;
}

export async function createAdminCollege(dto: AdminCreateCollegeDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/colleges', dto);
  return res.data;
}

export async function updateAdminCollege(
  id: string,
  dto: AdminUpdateCollegeDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/colleges/${id}`, dto);
  return res.data;
}

export async function suspendAdminCollege(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/colleges/${id}`);
}

// ─── Companies (Sprint 2 — superadmin authoring) ────────────────────────────

export interface AdminCompanyRow {
  id: string;
  name: string;
  slug: string;
  type: 'SERVICE' | 'CONSULTING' | 'PRODUCT';
  tagline: string | null;
  displayOrder: number;
  isPublished: boolean;
}

export async function listAdminCompanies(): Promise<AdminCompanyRow[]> {
  const res = await apiClient.get<AdminCompanyRow[]>('/api/v1/admin/companies');
  return res.data;
}

export interface AdminCompanyStat {
  id: string;
  name: string;
  slug: string;
  registrations: number;
  assessments: number;
  questionCount: number;
  codingCount: number;
}

export async function getAdminCompanyStats(): Promise<AdminCompanyStat[]> {
  const res = await apiClient.get<AdminCompanyStat[]>('/api/v1/admin/company-stats');
  return res.data;
}

export async function createAdminCompany(dto: AdminCreateCompanyDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/companies', dto);
  return res.data;
}

export async function updateAdminCompany(
  id: string,
  dto: AdminUpdateCompanyDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/companies/${id}`, dto);
  return res.data;
}

// ─── Questions (Sprint 3 — superadmin question-bank CRUD) ───────────────────

export interface AdminQuestionRow {
  id: string;
  type: 'MCQ' | 'MULTI_SELECT' | 'NUMERIC' | 'CODING';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  stem: string;
  /** The (leaf) topic this question is tagged to — backend field is `subtopicId`. */
  subtopicId: string | null;
  companyId: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  // Enriched metadata (now populated by the dedicated company banks).
  answer?: string | null;
  solution?: string | null;
  explanation?: string | null;
  hint?: string | null;
  source?: 'PREVIOUS_YEAR_QUESTIONS' | 'MEMORY_BASED' | 'PATTERN_BASED' | 'MOCK_DERIVED' | null;
  frequency?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  yearTags?: number[];
  roleTags?: string[];
  sourceRef?: string | null;
  verified?: boolean;
}

export interface AdminQuestionDetail {
  question: AdminQuestionRow;
  options: Array<{ id: string; text: string; isCorrect: boolean; orderIndex: number }>;
  companyTags: Array<{ companyId: string; importance: string }>;
  contentUsage: Array<{ usageType: string }>;
}

export async function listAdminQuestions(
  params: {
    status?: string;
    topic?: string;
    role?: string;
    company?: string;
    difficulty?: string;
    source?: string;
    verified?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ rows: AdminQuestionRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.topic) qs.set('topic', params.topic);
  if (params.role) qs.set('role', params.role);
  if (params.company) qs.set('company', params.company);
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  if (params.source) qs.set('source', params.source);
  if (params.verified !== undefined) qs.set('verified', String(params.verified));
  if (params.search) qs.set('search', params.search);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<{ rows: AdminQuestionRow[]; total: number }>(
    `/api/v1/admin/questions${suffix}`,
  );
  return res.data;
}

export async function getAdminQuestion(id: string): Promise<AdminQuestionDetail> {
  const res = await apiClient.get<AdminQuestionDetail>(`/api/v1/admin/questions/${id}`);
  return res.data;
}

export async function createAdminQuestion(dto: AdminCreateQuestionDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/questions', dto);
  return res.data;
}

export async function updateAdminQuestion(
  id: string,
  dto: AdminUpdateQuestionDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/questions/${id}`, dto);
  return res.data;
}

export async function archiveAdminQuestion(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/questions/${id}`);
}

// ─── Platform stats (super-admin dashboard) ─────────────────────────────────

export interface AdminPlatformStats {
  students: number;
  colleges: number;
  companies: number;
  courses: number;
  questionsPublished: number;
  questionsTotal: number;
  mockTests: number;
  mockAttempts: number;
  practiceAttempts: number;
  // Enriched telemetry (added alongside the dashboard revamp). Optional so the
  // UI degrades gracefully against an older backend that omits them.
  totalUsers?: number;
  admins?: number;
  verifiedStudents?: number;
  newStudents7d?: number;
  newStudents30d?: number;
  mockAttemptsInProgress?: number;
  adaptiveSessions?: number;
  questionsByDifficulty?: { easy: number; medium: number; hard: number };
  signups?: Array<{ date: string; count: number }>;
}

export async function getAdminStats(): Promise<AdminPlatformStats> {
  const res = await apiClient.get<AdminPlatformStats>('/api/v1/admin/stats');
  return res.data;
}

// ─── View-as-student preview (super-admin QA tool) ──────────────────────────

export interface ImpersonatePreview {
  /** Short-lived STUDENT access token (no refresh) — layer over the admin session. */
  accessToken: string;
  user: {
    id: string;
    name: string | null;
    role: 'STUDENT' | 'COLLEGE_ADMIN' | 'ADMIN' | 'SUPER_ADMIN';
    isOnboarded: boolean;
  };
}

/** Mint a student preview token. Omit studentId to auto-pick a demo student. */
export async function impersonateStudent(studentId?: string): Promise<ImpersonatePreview> {
  const res = await apiClient.post<ImpersonatePreview>(
    '/api/v1/admin/impersonate',
    studentId ? { studentId } : {},
  );
  return res.data;
}

// ─── Mock-test CRUD (Sprint 4 — superadmin "Mock test definitions") ──────────

export interface AdminMockRow {
  id: string;
  title: string;
  companyId: string | null;
  durationMinutes: number;
  totalQuestions: number;
  passingScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminMockQuestion {
  id: string;
  orderIndex: number;
  stem: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface AdminMockDetail extends AdminMockRow {
  questions: AdminMockQuestion[];
}

export interface AdminCreateMock {
  title: string;
  companyId?: string | null;
  durationMinutes: number;
  passingScore: number;
  questionIds: string[];
  isActive?: boolean;
}

export type AdminUpdateMock = Partial<AdminCreateMock>;

export async function listAdminMocks(): Promise<AdminMockRow[]> {
  const res = await apiClient.get<AdminMockRow[]>('/api/v1/admin/mocks');
  return res.data;
}

export async function getAdminMock(id: string): Promise<AdminMockDetail> {
  const res = await apiClient.get<AdminMockDetail>(`/api/v1/admin/mocks/${id}`);
  return res.data;
}

export async function createAdminMock(dto: AdminCreateMock): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/mocks', dto);
  return res.data;
}

export async function updateAdminMock(id: string, dto: AdminUpdateMock): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/mocks/${id}`, dto);
  return res.data;
}

export async function deleteAdminMock(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/mocks/${id}`);
}

// ─── Bulk question import (CSV) ─────────────────────────────────────────────

export interface AdminImportRow {
  line: number;
  stem: string;
  status: 'created' | 'invalid';
  reason?: string;
}

export interface AdminImportResult {
  created: number;
  invalid: number;
  rows: AdminImportRow[];
}

export async function importAdminQuestions(csv: string): Promise<AdminImportResult> {
  const res = await apiClient.post<AdminImportResult>('/api/v1/admin/questions/import', { csv });
  return res.data;
}

// ─── Courses / modules / lessons (Sprint 2 — superadmin authoring) ──────────
//
// The public `GET /courses` filters is_published=true, so this console reads
// through the admin-only `GET /admin/courses[/:slug]` endpoints, which include
// drafts being authored. Mutations reuse the shared create/update DTOs.

export interface AdminCourseRow {
  id: string;
  slug: string;
  title: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  estimatedHours: number;
  isPublished: boolean;
  moduleCount: number;
  lessonCount: number;
  updatedAt: string;
}

export interface AdminCourseLesson {
  id: string;
  title: string;
  kind: LessonKind;
  durationMinutes: number;
  videoProviderId: string | null;
  body: string | null;
  orderIndex: number;
  isFree: boolean;
}

export interface AdminCourseModule {
  id: string;
  title: string;
  summary: string | null;
  orderIndex: number;
  lessons: AdminCourseLesson[];
}

export interface AdminCourseDetail {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  estimatedHours: number;
  isPublished: boolean;
  modules: AdminCourseModule[];
}

export async function listAdminCourses(): Promise<AdminCourseRow[]> {
  const res = await apiClient.get<AdminCourseRow[]>('/api/v1/admin/courses');
  return res.data;
}

export async function getAdminCourse(slug: string): Promise<AdminCourseDetail> {
  const res = await apiClient.get<AdminCourseDetail>(`/api/v1/admin/courses/${slug}`);
  return res.data;
}

export async function createAdminCourse(dto: AdminCreateCourseDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/courses', dto);
  return res.data;
}

export async function updateAdminCourse(
  id: string,
  dto: AdminUpdateCourseDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/courses/${id}`, dto);
  return res.data;
}

export async function createAdminModule(dto: AdminCreateModuleDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/modules', dto);
  return res.data;
}

export async function updateAdminModule(
  id: string,
  dto: AdminUpdateModuleDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/modules/${id}`, dto);
  return res.data;
}

export async function deleteAdminModule(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/modules/${id}`);
}

export async function createAdminLesson(dto: AdminCreateLessonDto): Promise<{ id: string }> {
  const res = await apiClient.post<{ id: string }>('/api/v1/admin/lessons', dto);
  return res.data;
}

export async function updateAdminLesson(
  id: string,
  dto: AdminUpdateLessonDto,
): Promise<{ id: string }> {
  const res = await apiClient.patch<{ id: string }>(`/api/v1/admin/lessons/${id}`, dto);
  return res.data;
}

export async function deleteAdminLesson(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/lessons/${id}`);
}

export async function deleteAdminCourse(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/courses/${id}`);
}

// ─── Student performance reports (super-admin) ──────────────────────────────

export interface AdminStudentReportRow {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  collegeName: string | null;
  createdAt: string;
  attempts: number;
  avgScorePct: number | null;
  bestScorePct: number | null;
  lastAttemptAt: string | null;
}

export interface AdminMockAttemptReport {
  id: string;
  mockTitle: string;
  score: number | null;
  total: number | null;
  percentage: number | null;
  percentile: number | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSec: number | null;
}

export interface AdminStudentFullReport {
  student: {
    id: string;
    email: string;
    fullName: string | null;
    status: string;
    isEmailVerified: boolean;
    collegeName: string | null;
    phone: string | null;
    passoutYear: number | null;
    createdAt: string;
  };
  summary: {
    totalAttempts: number;
    avgScorePct: number | null;
    bestScorePct: number | null;
    totalTimeSec: number;
    practiceAttempts: number;
    practiceCorrect: number;
    adaptiveSessions: number;
  };
  mockAttempts: AdminMockAttemptReport[];
}

export async function listStudentReports(
  params: { search?: string; collegeId?: string; limit?: number; offset?: number } = {},
): Promise<{ rows: AdminStudentReportRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.collegeId) qs.set('collegeId', params.collegeId);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<{ rows: AdminStudentReportRow[]; total: number }>(
    `/api/v1/admin/reports/students${suffix}`,
  );
  return res.data;
}

export async function getStudentReport(id: string): Promise<AdminStudentFullReport> {
  const res = await apiClient.get<AdminStudentFullReport>(`/api/v1/admin/reports/students/${id}`);
  return res.data;
}

// ─── College detail (admin + super-admin) ───────────────────────────────────

export interface AdminCollegeDetail {
  college: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    status: string;
    createdAt: string;
  };
  studentCount: number;
  activeStudentCount: number;
  invitedStudentCount: number;
  cohortCount: number;
  mockAttempts: number;
  avgScorePct: number | null;
  lastActivityAt: string | null;
}

export async function getAdminCollegeDetail(id: string): Promise<AdminCollegeDetail> {
  const res = await apiClient.get<AdminCollegeDetail>(`/api/v1/admin/reports/colleges/${id}`);
  return res.data;
}

export interface AdminCohortRow {
  id: string;
  name: string;
  year: number | null;
  studentCount: number;
}

export async function listAdminCollegeCohorts(collegeId: string): Promise<AdminCohortRow[]> {
  const res = await apiClient.get<AdminCohortRow[]>(
    `/api/v1/admin/reports/colleges/${collegeId}/cohorts`,
  );
  return res.data;
}
