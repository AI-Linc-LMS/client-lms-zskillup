import { apiClient } from './client';
import type { GamificationSummary } from './gamification-types';
import type {
  AdminCodingPreviewResultDto,
  AdminCodingSearchQueryDto,
  AdminCodingSearchResultDto,
} from '@/shared/dto/admin-coding-search.dto';

/**
 * Coding API client. Code never executes in the browser - it is sent to the
 * backend, which runs it on the self-hosted Judge0 and returns graded results.
 * Hidden test cases (input/expected) are redacted server-side and never arrive.
 */

export interface CodingLanguage {
  /** Backend key, e.g. "python" - pass this to run/submit. */
  name: string;
  label: string;
  /** Monaco language id, e.g. "python" / "cpp". */
  monaco: string;
}

export interface CodingProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  xpReward: number;
  solved: boolean;
}

export interface CodingSampleCase {
  input: string;
  expectedOutput: string;
}

export interface CodingProblem extends CodingProblemListItem {
  statement: string;
  inputFormat: string | null;
  outputFormat: string | null;
  constraints: string | null;
  sampleInput: string | null;
  sampleOutput: string | null;
  /** Per-language starter code, keyed by language name. */
  starterCode: Record<string, string>;
  sampleCases: CodingSampleCase[];
  timeLimitMs: number;
  /** Languages this problem offers (SQL-only for SQL problems, else Core-5). */
  languages?: CodingLanguage[];
}

export interface CodingCaseResult {
  index: number;
  hidden: boolean;
  passed: boolean;
  status: string;
  input: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  stderr: string | null;
  timeSec: number | null;
}

export interface CodingResult {
  ok: boolean;
  error: string | null;
  /** ACCEPTED | WRONG_ANSWER | RUNTIME_ERROR | COMPILE_ERROR | TLE | ERROR | NO_TESTS */
  verdict: string;
  passed: number;
  total: number;
  compileOutput: string | null;
  cases: CodingCaseResult[];
  /** XP/streak deltas (submit only, on first accept; null otherwise). */
  gamification?: GamificationSummary | null;
}

/** Free-form runner result (POST /coding/run) - no grading. */
export interface CodingRunOutput {
  ok: boolean;
  error?: string;
  output?: string;
  status?: string;
  stderr?: string | null;
  compileOutput?: string | null;
  timeSec?: number | null;
}

export async function getCodingLanguages(): Promise<{
  configured: boolean;
  languages: CodingLanguage[];
}> {
  const res = await apiClient.get<{ configured: boolean; languages: CodingLanguage[] }>(
    '/api/v1/coding/languages',
  );
  return res.data;
}

export async function listCodingProblems(company?: string): Promise<CodingProblemListItem[]> {
  const qs = company ? `?company=${encodeURIComponent(company)}` : '';
  const res = await apiClient.get<CodingProblemListItem[]>(`/api/v1/coding/problems${qs}`);
  return res.data;
}

export async function getCodingProblem(slug: string): Promise<CodingProblem> {
  const res = await apiClient.get<CodingProblem>(`/api/v1/coding/problems/${slug}`);
  return res.data;
}

/** Run a solution against the problem's SAMPLE cases (visible feedback, no XP). */
export async function runCodingSample(
  slug: string,
  language: string,
  source: string,
): Promise<CodingResult> {
  const res = await apiClient.post<CodingResult>(`/api/v1/coding/problems/${slug}/run`, {
    language,
    source,
  });
  return res.data;
}

/** Submit a solution against ALL cases (graded, awards XP on first accept). */
export async function submitCoding(
  slug: string,
  language: string,
  source: string,
): Promise<CodingResult> {
  const res = await apiClient.post<CodingResult>(`/api/v1/coding/problems/${slug}/submit`, {
    language,
    source,
  });
  return res.data;
}

/** Admin: all coding problems (active + inactive) for authoring/pickers. */
export interface AdminCodingProblemSummary {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isActive: boolean;
  // Provenance + verification (parity with the quiz bank).
  companies?: string[];
  roleTags?: string[];
  source?: string | null;
  yearTags?: number[];
  sourceRef?: string | null;
  verified?: boolean;
  tags?: string[];
  xpReward?: number;
  // Full problem body - the admin list endpoint returns whole entities, so the
  // detail drawer renders straight from the row (no extra fetch).
  statement?: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  constraints?: string | null;
  sampleInput?: string | null;
  sampleOutput?: string | null;
  testCases?: { input: string; expectedOutput: string; isSample?: boolean }[];
  starterCode?: Record<string, string>;
  referenceSolution?: { language: string; source: string } | null;
  timeLimitMs?: number | null;
  memoryLimitKb?: number | null;
}

export async function listAdminCodingProblems(): Promise<AdminCodingProblemSummary[]> {
  const res = await apiClient.get<AdminCodingProblemSummary[]>('/api/v1/admin/coding/problems');
  return res.data;
}

export async function setCodingProblemActive(id: string, isActive: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/admin/coding/problems/${id}`, { isActive });
}

/** Hard-delete a coding problem. 409 CODING_PROBLEM_IN_USE when it is linked to any mock
 *  or has recorded answers — deactivate it instead. */
export async function deleteAdminCodingProblem(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/admin/coding/problems/${id}`);
}

/**
 * MANUAL selection: paginated coding-problem summaries (ADMIN, SUPER_ADMIN). Metadata
 * only — never test cases or solutions. `active` defaults to true server-side.
 */
export async function searchAdminCodingProblems(
  q: AdminCodingSearchQueryDto,
  opts?: { signal?: AbortSignal },
): Promise<AdminCodingSearchResultDto> {
  const qs = new URLSearchParams();
  if (q.topic) qs.set('topic', q.topic);
  if (q.difficulty) qs.set('difficulty', q.difficulty);
  if (q.company) qs.set('company', q.company);
  if (q.verified !== undefined) qs.set('verified', String(q.verified));
  if (q.active !== undefined) qs.set('active', String(q.active));
  if (q.search) qs.set('search', q.search);
  if (q.excludeIds?.length) qs.set('excludeIds', q.excludeIds.join(','));
  if (q.limit) qs.set('limit', String(q.limit));
  if (q.offset !== undefined) qs.set('offset', String(q.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await apiClient.get<AdminCodingSearchResultDto>(
    `/api/v1/admin/coding/problems/search${suffix}`,
    { signal: opts?.signal },
  );
  return res.data;
}

/** Review picked coding problems: summary + statement + VISIBLE examples, in request order;
 *  unknown ids come back in `missingIds`. At most 200 ids per call. */
export async function previewAdminCodingProblems(ids: string[]): Promise<AdminCodingPreviewResultDto> {
  if (ids.length === 0) return { items: [], missingIds: [] };
  const res = await apiClient.post<AdminCodingPreviewResultDto>('/api/v1/admin/coding/problems/preview', {
    ids,
  });
  return res.data;
}

/** Run arbitrary code with custom stdin (scratchpad / "Run" with custom input). */
export async function runCodingCustom(
  language: string,
  source: string,
  stdin = '',
): Promise<CodingRunOutput> {
  const res = await apiClient.post<CodingRunOutput>('/api/v1/coding/run', {
    language,
    source,
    stdin,
  });
  return res.data;
}
