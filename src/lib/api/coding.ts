import { apiClient } from './client';
import type { GamificationSummary } from './gamification-types';

/**
 * Coding API client. Code never executes in the browser — it is sent to the
 * backend, which runs it on the self-hosted Judge0 and returns graded results.
 * Hidden test cases (input/expected) are redacted server-side and never arrive.
 */

export interface CodingLanguage {
  /** Backend key, e.g. "python" — pass this to run/submit. */
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

/** Free-form runner result (POST /coding/run) — no grading. */
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

export async function listCodingProblems(): Promise<CodingProblemListItem[]> {
  const res = await apiClient.get<CodingProblemListItem[]>('/api/v1/coding/problems');
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
}

export async function listAdminCodingProblems(): Promise<AdminCodingProblemSummary[]> {
  const res = await apiClient.get<AdminCodingProblemSummary[]>('/api/v1/admin/coding/problems');
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
