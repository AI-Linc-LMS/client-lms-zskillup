'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Sparkles,
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
  listAdminQuestions,
  updateAdminQuestion,
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

const PAGE_SIZE = 12;

type SortKey = 'recent' | 'oldest' | 'alphabetical' | 'difficulty' | 'status';

const DIFFICULTY_WEIGHT: Record<string, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
};

const STATUS_WEIGHT: Record<string, number> = {
  PUBLISHED: 0,
  DRAFT: 1,
  ARCHIVED: 2,
};

/**
 * Superadmin question-bank console (Sprint 3 exit criterion). Drives
 * `GET/POST/PATCH/DELETE /api/v1/admin/questions`. The form encodes the same
 * shape rules the backend enforces (MCQ = exactly one correct option,
 * MULTI_SELECT = at least one, NUMERIC/CODING = no options); the server
 * re-validates and any 400 is surfaced inline.
 */
export function QuestionsAdmin() {
  const [rows, setRows] = useState<AdminQuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded: AdminQuestionRow[] = [];
      let offset = 0;
      let totalCount = 0;

      while (true) {
        const res = await listAdminQuestions({
          status: statusFilter || undefined,
          limit: 100,
          offset,
        });
        totalCount = res.total;
        loaded.push(...res.rows);
        if (loaded.length >= res.total || res.rows.length === 0) break;
        offset += 100;
      }

      setRows(loaded);
      setTotal(totalCount);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load questions.');
    }
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search, sortBy]);

  useEffect(() => {
    listTopics()
      .then((ts) => setTopicNames(Object.fromEntries(ts.map((t) => [t.id, t.name]))))
      .catch(() => {});
  }, []);

  const visibleRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const filteredRows = (rows ?? []).filter(
      (r) => !searchTerm || r.stem.toLowerCase().includes(searchTerm),
    );

    return [...filteredRows].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.stem.localeCompare(b.stem);
        case 'difficulty':
          return DIFFICULTY_WEIGHT[a.difficulty] - DIFFICULTY_WEIGHT[b.difficulty];
        case 'status':
          return STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [rows, search, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visibleRows.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleStart = visibleRows.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + PAGE_SIZE, visibleRows.length);
  const stats = useMemo(() => {
    const source = rows ?? [];
    return {
      total: source.length,
      published: source.filter((row) => row.status === 'PUBLISHED').length,
      draft: source.filter((row) => row.status === 'DRAFT').length,
      archived: source.filter((row) => row.status === 'ARCHIVED').length,
    };
  }, [rows]);

  const archive = useCallback(
    async (row: AdminQuestionRow) => {
      if (!window.confirm('Archive this question? It will no longer be served to students.')) return;
      setBusyId(row.id);
      try {
        await archiveAdminQuestion(row.id);
        await refresh();
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not archive question.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const togglePublish = useCallback(
    async (row: AdminQuestionRow) => {
      const next = row.status === 'PUBLISHED' ? QuestionStatus.DRAFT : QuestionStatus.PUBLISHED;
      setBusyId(row.id);
      try {
        await updateAdminQuestion(row.id, { status: next });
        await refresh();
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not update question.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const exportCsv = useCallback(() => {
    const escapeCsv = (value: string | number | null | undefined) =>
      JSON.stringify(String(value ?? ''));

    const headers = [
      'id',
      'stem',
      'type',
      'difficulty',
      'topic',
      'topicId',
      'status',
      'companyId',
      'createdAt',
    ];
    const lines = [headers.map(escapeCsv).join(',')];

    for (const row of visibleRows) {
      lines.push(
        [
          row.id,
          row.stem,
          TYPE_LABEL[row.type] ?? row.type,
          row.difficulty,
          topicNames[row.subtopicId] ?? '',
          row.subtopicId,
          row.status,
          row.companyId ?? '',
          row.createdAt,
        ]
          .map(escapeCsv)
          .join(','),
      );
    }

    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zskillup-question-bank-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [topicNames, visibleRows]);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.10),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.03),_rgba(248,250,252,1))] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Total" value={stats.total} accent="text-navy" />
              <MetricCard label="Published" value={stats.published} accent="text-emerald-700" />
              <MetricCard label="Drafts" value={stats.draft} accent="text-amber-700" />
              <MetricCard label="Archived" value={stats.archived} accent="text-slate-500" />
            </div>
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search question text"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                aria-label="Search questions"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
                  <button
                    key={s || 'all'}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(1);
                    }}
                    className={
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ' +
                      (statusFilter === s
                        ? 'bg-navy text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-navy')
                    }
                  >
                    {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                <ArrowUpDown className="size-4 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Sort questions</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-transparent text-sm font-semibold text-navy focus-visible:outline-none"
                  aria-label="Sort questions"
                >
                  <option value="recent">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="alphabetical">Stem A-Z</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="status">Status</option>
                </select>
              </label>

              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={visibleRows.length === 0}
              >
                <Download className="size-4" /> Download CSV
              </Button>
              <Button
                onClick={() => {
                  setShowForm((v) => !v);
                }}
                size="sm"
              >
                <Plus className="size-4" /> {showForm ? 'Close' : 'Add question'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showForm ? (
        <AddQuestionForm
          onCreated={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/90">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              <th className="px-4 py-4">Question</th>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Difficulty</th>
              <th className="px-4 py-4">Topic</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" aria-hidden="true" />
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  {search || statusFilter
                    ? 'No questions match this view.'
                    : 'No questions yet — author the first one above.'}
                </td>
              </tr>
            ) : (
              pageRows.map((q) => (
                <tr
                  key={q.id}
                  className="border-t border-slate-100/80 align-top transition-colors hover:bg-slate-50/60"
                >
                  <td className="max-w-md px-4 py-4 text-navy">
                    <span className="line-clamp-2">{q.stem}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{TYPE_LABEL[q.type] ?? q.type}</td>
                  <td className="px-4 py-4 text-slate-600 capitalize">{q.difficulty.toLowerCase()}</td>
                  <td className="px-4 py-4 text-slate-600">{topicNames[q.subtopicId] ?? '—'}</td>
                  <td className="px-4 py-4">
                    <QStatusPill status={q.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      {q.status !== 'ARCHIVED' ? (
                        <button
                          type="button"
                          disabled={busyId === q.id}
                          onClick={() => togglePublish(q)}
                          className="text-xs font-semibold text-navy transition-colors hover:text-orange disabled:opacity-50"
                        >
                          {q.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        </button>
                      ) : null}
                      {q.status !== 'ARCHIVED' ? (
                        <button
                          type="button"
                          disabled={busyId === q.id}
                          onClick={() => archive(q)}
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
          <p className="text-sm text-slate-500">
            {visibleRows.length === 0
              ? 'No rows to show.'
              : `Showing ${visibleStart}–${visibleEnd} of ${visibleRows.length} filtered questions`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || visibleRows.length === 0}
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
              Page {Math.min(currentPage, pageCount)} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount || visibleRows.length === 0}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {total} question{total === 1 ? '' : 's'} total
        {search ? ` · ${visibleRows.length} matching` : ''}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

// ─── Add-question form ──────────────────────────────────────────────────────

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
    // Client-side mirror of the backend rules (server re-validates).
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
              <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
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
