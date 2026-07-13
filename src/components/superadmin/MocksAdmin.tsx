'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Download, FileText, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DIFFICULTY_TONE } from '@/lib/ui-maps';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { StatusPill } from '@/components/student/StatusPill';
import { ApiRequestError } from '@/lib/api/types';
import { listTopics } from '@/lib/api/catalog';
import {
  createAdminMock,
  deleteAdminMock,
  exportMocks,
  getAdminMock,
  listAdminMocks,
  listAdminQuestions,
  updateAdminMock,
  type AdminMockRow,
  type AdminQuestionRow,
} from '@/lib/api/admin';

/**
 * Superadmin mock-test console (Sprint 4 — "Mock test definitions"). Drives
 * `/api/v1/admin/mocks`. The admin authors a timed mock from a title, duration,
 * passing score and a set of PUBLISHED questions; the student engine serves and
 * grades it. Mirrors the question-bank console pattern.
 */

interface FormState {
  title: string;
  durationMinutes: number;
  passingScore: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { title: '', durationMinutes: 30, passingScore: 60, isActive: true };

export function MocksAdmin() {
  const [mocks, setMocks] = useState<AdminMockRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<AdminQuestionRow[] | null>(null);
  const [topicNames, setTopicNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      setMocks(await listAdminMocks());
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : 'Could not load mock tests.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    listAdminQuestions({ status: 'PUBLISHED', limit: 100 })
      .then((res) => setQuestions(res.rows))
      .catch(() => setQuestions([]));
    listTopics()
      .then((ts) => setTopicNames(Object.fromEntries(ts.map((t) => [t.id, t.name]))))
      .catch(() => {});
  }, []);

  const filteredQuestions = useMemo(
    () =>
      (questions ?? []).filter(
        (q) => !search || q.stem.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [questions, search],
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelected([]);
    setEditingId(null);
    setFormError(null);
    setSearch('');
    setMode('create');
  }

  async function openEdit(row: AdminMockRow) {
    setBusyId(row.id);
    try {
      const detail = await getAdminMock(row.id);
      setForm({
        title: detail.title,
        durationMinutes: detail.durationMinutes,
        passingScore: detail.passingScore,
        isActive: detail.isActive,
      });
      setSelected(detail.questions.map((q) => q.id));
      setEditingId(row.id);
      setFormError(null);
      setSearch('');
      setMode('edit');
    } catch (err) {
      window.alert(err instanceof ApiRequestError ? err.message : 'Could not open the mock.');
    } finally {
      setBusyId(null);
    }
  }

  function toggleQuestion(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    setFormError(null);
    if (form.title.trim().length < 3) return setFormError('Title must be at least 3 characters.');
    if (form.durationMinutes < 1 || form.durationMinutes > 300)
      return setFormError('Duration must be between 1 and 300 minutes.');
    if (form.passingScore < 0 || form.passingScore > 100)
      return setFormError('Passing score must be between 0 and 100.');
    if (selected.length < 1) return setFormError('Select at least one question.');

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        durationMinutes: form.durationMinutes,
        passingScore: form.passingScore,
        isActive: form.isActive,
        questionIds: selected,
      };
      if (mode === 'edit' && editingId) {
        await updateAdminMock(editingId, payload);
      } else {
        await createAdminMock(payload);
      }
      await refresh();
      setMode('list');
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : 'Could not save the mock test.');
    } finally {
      setSaving(false);
    }
  }

  const toggleActive = useCallback(
    async (row: AdminMockRow) => {
      setBusyId(row.id);
      try {
        await updateAdminMock(row.id, { isActive: !row.isActive });
        await refresh();
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not update the mock.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (row: AdminMockRow) => {
      if (
        !window.confirm(
          `Delete "${row.title}"? If students have already attempted it, it will be deactivated instead.`,
        )
      )
        return;
      setBusyId(row.id);
      try {
        await deleteAdminMock(row.id);
        await refresh();
      } catch (err) {
        window.alert(err instanceof ApiRequestError ? err.message : 'Could not delete the mock.');
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  // ── Create / edit form ────────────────────────────────────────────────────
  if (mode !== 'list') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">
            {mode === 'edit' ? 'Edit mock test' : 'New mock test'}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setMode('list')}>
            <X className="size-4" aria-hidden="true" /> Cancel
          </Button>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              id="mock-title"
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Infosys InfyTQ - Timed Mock"
            />
          </div>
          <FormField
            id="mock-duration"
            label="Duration (minutes)"
            type="number"
            value={String(form.durationMinutes)}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
          <FormField
            id="mock-pass"
            label="Passing score (%)"
            type="number"
            value={String(form.passingScore)}
            onChange={(e) => setForm((f) => ({ ...f, passingScore: Number(e.target.value) }))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Active (visible to students)
          </label>
        </div>

        {/* Question picker */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-navy">
              Questions{' '}
              <span className="font-normal text-slate-400">- {selected.length} selected</span>
            </p>
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search published questions"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy placeholder:text-slate-400 focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                aria-label="Search questions"
              />
            </div>
          </div>

          {questions === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No published questions match. Author questions in the Question Bank first.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {filteredQuestions.map((q) => {
                const isSelected = selected.includes(q.id);
                const order = selected.indexOf(q.id) + 1;
                const diff = DIFFICULTY_TONE[q.difficulty];
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => toggleQuestion(q.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                        isSelected
                          ? 'border-orange bg-orange/5'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-5 shrink-0 place-items-center rounded text-[10px] font-bold',
                          isSelected ? 'bg-orange text-[#171717]' : 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {isSelected ? order : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-navy">
                          {q.stem}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <StatusPill tone={diff.tone} label={diff.label} />
                          {q.subtopicId && topicNames[q.subtopicId] ? (
                            <span>{topicNames[q.subtopicId]}</span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {formError ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setMode('list')} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {mode === 'edit' ? 'Save changes' : 'Create mock test'}
          </Button>
        </div>
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {mocks ? `${mocks.length} mock test${mocks.length === 1 ? '' : 's'}` : 'Loading…'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setExporting(true);
              try {
                await exportMocks();
              } catch {
                /* download simply won't start */
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || !mocks || mocks.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export JSON
          </button>
          <Button onClick={openCreate} size="sm">
            <Plus className="size-4" aria-hidden="true" /> New mock test
          </Button>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : mocks === null ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-12">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden="true" />
        </div>
      ) : mocks.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-orange/10 text-[#f5b400] ring-1 ring-orange/20">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-navy">No mock tests yet.</p>
          <p className="mt-1 text-xs text-slate-500">Create one from your published question bank.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[2.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 md:grid">
            {['Title', 'Questions', 'Duration', 'Status', 'Actions'].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {h}
              </span>
            ))}
          </div>
          {mocks.map((m, idx) => (
            <div
              key={m.id}
              className={`grid grid-cols-1 gap-2 px-5 py-3.5 md:grid-cols-[2.4fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 ${idx < mocks.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{m.title}</p>
                <p className="text-[11px] text-slate-400">Pass {m.passingScore}%</p>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <FileText className="size-3.5 text-slate-400 md:hidden" aria-hidden="true" />
                {m.totalQuestions} questions
              </p>
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <Clock className="size-3.5 text-slate-400 md:hidden" aria-hidden="true" />
                {m.durationMinutes} min
              </p>
              <div>
                {m.isActive ? (
                  <StatusPill tone="positive" label="Active" />
                ) : (
                  <StatusPill tone="neutral" label="Inactive" />
                )}
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Button variant="outline" size="sm" onClick={() => openEdit(m)} disabled={busyId === m.id}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(m)} disabled={busyId === m.id}>
                  {m.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  disabled={busyId === m.id}
                  aria-label={`Delete ${m.title}`}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
