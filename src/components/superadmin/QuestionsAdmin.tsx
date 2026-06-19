'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { ApiRequestError } from '@/lib/api/types';
import { listTopics, listCompanies } from '@/lib/api/catalog';
import {
  archiveAdminQuestion,
  createAdminQuestion,
  getAdminQuestion,
  listAdminQuestions,
  updateAdminQuestion,
  type AdminQuestionDetail,
  type AdminQuestionRow,
} from '@/lib/api/admin';
import { QuestionDifficulty, QuestionStatus, QuestionType } from '@/shared/enums';
import type { AdminCreateQuestionDto } from '@/shared/dto/admin-questions.dto';

const TYPE_LABEL: Record<string, string> = {
  MCQ: 'Single choice',
  MULTI_SELECT: 'Multi-select',
  NUMERIC: 'Numeric',
  CODING: 'Coding',
};

const SOURCE_LABEL: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'PYQ',
  MEMORY_BASED: 'Memory-based',
  PATTERN_BASED: 'Pattern-based',
  MOCK_DERIVED: 'Mock-derived',
};

const SOURCE_TONE: Record<string, string> = {
  PREVIOUS_YEAR_QUESTIONS: 'bg-violet-50 text-violet-700 ring-violet-200',
  MEMORY_BASED: 'bg-sky-50 text-sky-700 ring-sky-200',
  PATTERN_BASED: 'bg-slate-50 text-slate-600 ring-slate-200',
  MOCK_DERIVED: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const DIFF_TONE: Record<string, string> = {
  EASY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  HARD: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const PAGE_SIZE = 15;

/**
 * Superadmin question-bank console. Server-side paginated + filtered (the bank
 * is ~17k questions across companies, so loading all client-side throttles).
 * Surfaces the enriched metadata — provenance/source, year tags, target roles,
 * hint/solution — inline and in a per-question detail drawer.
 */
export function QuestionsAdmin() {
  const [rows, setRows] = useState<AdminQuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, published: 0, draft: 0, archived: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [companies, setCompanies] = useState<Array<{ slug: string; name: string }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Debounce the search box → server query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, companyFilter, difficultyFilter, sourceFilter, debouncedSearch]);

  const baseFilters = useMemo(
    () => ({
      company: companyFilter || undefined,
      difficulty: difficultyFilter || undefined,
      source: sourceFilter || undefined,
      search: debouncedSearch || undefined,
    }),
    [companyFilter, difficultyFilter, sourceFilter, debouncedSearch],
  );

  const loadPage = useCallback(async () => {
    setLoadError(null);
    setRows(null);
    try {
      const res = await listAdminQuestions({
        ...baseFilters,
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load questions.');
      setRows([]);
    }
  }, [baseFilters, statusFilter, page]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  // Metric cards — small count-only queries (limit 1, read `total`).
  const loadCounts = useCallback(async () => {
    try {
      const [all, published, draft, archived] = await Promise.all([
        listAdminQuestions({ ...baseFilters, limit: 1, offset: 0 }),
        listAdminQuestions({ ...baseFilters, status: 'PUBLISHED', limit: 1, offset: 0 }),
        listAdminQuestions({ ...baseFilters, status: 'DRAFT', limit: 1, offset: 0 }),
        listAdminQuestions({ ...baseFilters, status: 'ARCHIVED', limit: 1, offset: 0 }),
      ]);
      setCounts({
        all: all.total,
        published: published.total,
        draft: draft.total,
        archived: archived.total,
      });
    } catch {
      /* metric cards are best-effort */
    }
  }, [baseFilters]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    listTopics()
      .then((ts) => setTopicNames(Object.fromEntries(ts.map((t) => [t.id, t.name]))))
      .catch(() => {});
    listCompanies()
      .then((cs) => {
        setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name })));
        setCompanyNames(Object.fromEntries(cs.map((c) => [c.id, c.name])));
      })
      .catch(() => {});
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visibleStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const visibleEnd = Math.min(page * PAGE_SIZE, total);

  const mutateStatus = useCallback(
    async (row: AdminQuestionRow, next: QuestionStatus, confirmMsg?: string) => {
      if (confirmMsg && !window.confirm(confirmMsg)) return;
      setBusyId(row.id);
      try {
        if (next === QuestionStatus.ARCHIVED) await archiveAdminQuestion(row.id);
        else await updateAdminQuestion(row.id, { status: next });
        await Promise.all([loadPage(), loadCounts()]);
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not update question.');
      } finally {
        setBusyId(null);
      }
    },
    [loadPage, loadCounts],
  );

  return (
    <div className="space-y-5">
      {/* Header + metrics + filters */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.10),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.03),_rgba(248,250,252,1))] px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Matching" value={counts.all} accent="text-navy" />
            <MetricCard label="Published" value={counts.published} accent="text-emerald-700" />
            <MetricCard label="Drafts" value={counts.draft} accent="text-amber-700" />
            <MetricCard label="Archived" value={counts.archived} accent="text-slate-500" />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question text…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                aria-label="Search questions"
              />
            </div>

            <FilterSelect
              value={companyFilter}
              onChange={setCompanyFilter}
              ariaLabel="Filter by company"
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              ariaLabel="Filter by difficulty"
            >
              <option value="">All difficulty</option>
              {Object.values(QuestionDifficulty).map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect value={sourceFilter} onChange={setSourceFilter} ariaLabel="Filter by source">
              <option value="">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </FilterSelect>

            <Button onClick={() => setShowForm((v) => !v)} size="sm">
              <Plus className="size-4" /> {showForm ? 'Close' : 'Add'}
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 w-fit">
            {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
                  (statusFilter === s
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-navy')
                }
              >
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All status'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showForm ? (
        <AddQuestionForm
          onCreated={() => {
            setShowForm(false);
            void loadPage();
            void loadCounts();
          }}
        />
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/90">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-4 py-4">Question</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Difficulty</th>
                <th className="px-4 py-4">Topic</th>
                <th className="px-4 py-4">Source</th>
                <th className="px-4 py-4">Roles</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-slate-400" aria-hidden="true" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    No questions match this view.
                  </td>
                </tr>
              ) : (
                rows.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => setDetailId(q.id)}
                    className="cursor-pointer border-t border-slate-100/80 align-top transition-colors hover:bg-orange/5"
                  >
                    <td className="max-w-sm px-4 py-3.5 text-navy">
                      <span className="line-clamp-2">{q.stem}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {TYPE_LABEL[q.type] ?? q.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={DIFF_TONE[q.difficulty]}>{cap(q.difficulty)}</Pill>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {q.subtopicId ? topicNames[q.subtopicId] ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {q.source ? (
                        <Pill tone={SOURCE_TONE[q.source] ?? SOURCE_TONE.PATTERN_BASED}>
                          {SOURCE_LABEL[q.source] ?? q.source}
                          {q.yearTags && q.yearTags.length ? ` · ${q.yearTags.join(', ')}` : ''}
                        </Pill>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {q.roleTags && q.roleTags.length ? (
                        <span className="text-[11px] text-slate-500">
                          {q.roleTags.slice(0, 2).join(', ')}
                          {q.roleTags.length > 2 ? ` +${q.roleTags.length - 2}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <QStatusPill status={q.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-3">
                        {q.status !== 'ARCHIVED' ? (
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() =>
                              mutateStatus(
                                q,
                                q.status === 'PUBLISHED'
                                  ? QuestionStatus.DRAFT
                                  : QuestionStatus.PUBLISHED,
                              )
                            }
                            className="text-xs font-semibold text-navy transition-colors hover:text-orange disabled:opacity-50"
                          >
                            {q.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                          </button>
                        ) : null}
                        {q.status !== 'ARCHIVED' ? (
                          <button
                            type="button"
                            disabled={busyId === q.id}
                            onClick={() =>
                              mutateStatus(
                                q,
                                QuestionStatus.ARCHIVED,
                                'Archive this question? It will no longer be served to students.',
                              )
                            }
                            aria-label="Archive question"
                            className="text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
          <p className="text-sm text-slate-500">
            {total === 0 ? 'No rows.' : `Showing ${visibleStart}–${visibleEnd} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
              Page {Math.min(page, pageCount)} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {detailId ? (
        <QuestionDetailDrawer
          id={detailId}
          topicNames={topicNames}
          companyNames={companyNames}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function Pill({ tone, children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone ?? 'bg-slate-50 text-slate-600 ring-slate-200'}`}
    >
      {children}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-navy shadow-sm focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
    >
      {children}
    </select>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${accent}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ─── Detail drawer ──────────────────────────────────────────────────────────

function QuestionDetailDrawer({
  id,
  topicNames,
  companyNames,
  onClose,
}: {
  id: string;
  topicNames: Record<string, string>;
  companyNames: Record<string, string>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminQuestionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    getAdminQuestion(id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiRequestError ? e.message : 'Could not load question.');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const q = detail?.question;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div
        className="absolute inset-0 bg-navy/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Question detail
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy"
          >
            <X className="size-4" />
          </button>
        </div>

        {error ? (
          <p className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : !detail || !q ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={DIFF_TONE[q.difficulty]}>{cap(q.difficulty)}</Pill>
              <Pill>{TYPE_LABEL[q.type] ?? q.type}</Pill>
              {q.source ? (
                <Pill tone={SOURCE_TONE[q.source]}>
                  {SOURCE_LABEL[q.source] ?? q.source}
                  {q.yearTags && q.yearTags.length ? ` · ${q.yearTags.join(', ')}` : ''}
                </Pill>
              ) : null}
              {q.frequency ? <Pill>{cap(q.frequency.replace('_', ' '))} freq</Pill> : null}
              <QStatusPill status={q.status} />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Question</p>
              <p className="mt-1 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-navy">
                {q.stem}
              </p>
            </div>

            {detail.options.length ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Options
                </p>
                <div className="space-y-2">
                  {detail.options.map((o, i) => (
                    <div
                      key={o.id}
                      className={
                        'flex items-start gap-2.5 rounded-xl border p-2.5 text-sm ' +
                        (o.isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-700')
                      }
                    >
                      <span
                        className={
                          'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ' +
                          (o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500')
                        }
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{o.text}</span>
                      {o.isCorrect ? (
                        <span className="text-[10px] font-bold uppercase text-emerald-600">Correct</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : q.answer ? (
              <Field label="Answer">{q.answer}</Field>
            ) : null}

            {q.hint ? <Field label="Hint">{q.hint}</Field> : null}
            {q.solution ? <Field label="Solution">{q.solution}</Field> : null}
            {q.explanation ? <Field label="Explanation">{q.explanation}</Field> : null}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Topic</p>
                <p className="mt-1 text-sm text-slate-700">
                  {q.subtopicId ? topicNames[q.subtopicId] ?? '—' : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Companies
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {detail.companyTags.length
                    ? detail.companyTags
                        .map((t) => companyNames[t.companyId] ?? t.companyId.slice(0, 6))
                        .join(', ')
                    : '—'}
                </p>
              </div>
            </div>

            {q.roleTags && q.roleTags.length ? (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Target roles
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {q.roleTags.map((r) => (
                    <span
                      key={r}
                      className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.contentUsage.length ? (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Used in
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.contentUsage.map((u) => (
                    <span
                      key={u.usageType}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {cap(u.usageType.replace(/_/g, ' '))}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}

// ─── Add-question form (unchanged behaviour) ────────────────────────────────

interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

function AddQuestionForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState<QuestionType>(QuestionType.MCQ);
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(QuestionDifficulty.MEDIUM);
  const [stem, setStem] = useState('');
  const [topicSlug, setTopicSlug] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');
  const [status, setStatus] = useState<QuestionStatus>(QuestionStatus.DRAFT);
  const [options, setOptions] = useState<OptionDraft[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);
  const [topics, setTopics] = useState<Array<{ slug: string; name: string }>>([]);
  const [companies, setCompanies] = useState<Array<{ slug: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listTopics()
      .then((ts) => setTopics(ts.map((t) => ({ slug: t.slug, name: t.name }))))
      .catch(() => {});
    listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => {});
  }, []);

  const isChoice = type === QuestionType.MCQ || type === QuestionType.MULTI_SELECT;

  const setCorrect = (idx: number) => {
    setOptions((prev) =>
      prev.map((o, i) =>
        type === QuestionType.MCQ
          ? { ...o, isCorrect: i === idx }
          : i === idx
            ? { ...o, isCorrect: !o.isCorrect }
            : o,
      ),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (stem.trim().length < 5) return setError('Question text must be at least 5 characters.');
    if (!topicSlug) return setError('Pick a topic.');
    const cleanOptions = options.filter((o) => o.text.trim().length > 0);
    if (isChoice) {
      if (cleanOptions.length < 2) return setError('Add at least two options.');
      const correct = cleanOptions.filter((o) => o.isCorrect).length;
      if (correct === 0) return setError('Mark at least one option correct.');
      if (type === QuestionType.MCQ && correct !== 1)
        return setError('Single-choice questions need exactly one correct option.');
    }

    const dto: AdminCreateQuestionDto = {
      type,
      difficulty,
      stem: stem.trim(),
      hint: hint.trim() || undefined,
      explanation: explanation.trim() || undefined,
      topicSlug,
      companySlug: companySlug || undefined,
      status,
      options: isChoice
        ? cleanOptions.map((o, i) => ({ text: o.text.trim(), isCorrect: o.isCorrect, orderIndex: i }))
        : [],
    };

    setSubmitting(true);
    try {
      await createAdminQuestion(dto);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create question.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" noValidate>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">New question</p>
      <h2 className="mb-4 text-base font-bold text-navy">Author a practice question</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="q-type" className="block text-sm font-medium text-navy">Type</label>
          <select id="q-type" className={selectCls} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
            {Object.values(QuestionType).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="q-diff" className="block text-sm font-medium text-navy">Difficulty</label>
          <select id="q-diff" className={selectCls} value={difficulty} onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)}>
            {Object.values(QuestionDifficulty).map((d) => (
              <option key={d} value={d}>{cap(d)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="q-status" className="block text-sm font-medium text-navy">Status</label>
          <select id="q-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)}>
            <option value={QuestionStatus.DRAFT}>Draft</option>
            <option value={QuestionStatus.PUBLISHED}>Published</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="q-stem" className="block text-sm font-medium text-navy">Question text</label>
        <textarea
          id="q-stem"
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          rows={3}
          placeholder="What is 15% of 240?"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="q-topic" className="block text-sm font-medium text-navy">Topic</label>
          <select id="q-topic" className={selectCls} value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)}>
            <option value="">Select a topic…</option>
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="q-company" className="block text-sm font-medium text-navy">Company (optional)</label>
          <select id="q-company" className={selectCls} value={companySlug} onChange={(e) => setCompanySlug(e.target.value)}>
            <option value="">No company tag</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isChoice ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-navy">
              Options{' '}
              <span className="text-xs font-normal text-slate-400">
                ({type === QuestionType.MCQ ? 'pick one correct' : 'mark all correct'})
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOptions((p) => [...p, { text: '', isCorrect: false }])}
              className="text-xs font-semibold text-navy transition-colors hover:text-orange"
            >
              + Add option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(i)}
                  aria-pressed={o.isCorrect}
                  aria-label="Mark correct"
                  className={
                    'grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ' +
                    (o.isCorrect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200')
                  }
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <input
                  value={o.text}
                  onChange={(e) =>
                    setOptions((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
                  }
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setOptions((p) => p.filter((_, j) => j !== i))}
                    aria-label="Remove option"
                    className="text-slate-400 transition-colors hover:text-red-600"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          {type === QuestionType.NUMERIC ? 'Numeric' : 'Coding'} questions are stored without options
          (answers are graded separately) — add the prompt above.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="q-hint"
          label="Hint (optional)"
          placeholder="10% is 24, so 15% is 24 + 12."
          value={hint}
          onChange={(e) => setHint(e.target.value)}
        />
        <FormField
          id="q-explanation"
          label="Explanation (optional)"
          placeholder="15% of 240 = 0.15 × 240 = 36."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : 'Create question'}
        </Button>
      </div>
    </form>
  );
}

// ─── Status pill ────────────────────────────────────────────────────────────

function QStatusPill({ status }: { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }) {
  const map = {
    PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-700 ring-amber-200',
    ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-200',
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${map[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
