'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createQuestion,
  deleteQuestion,
  getJobQuestions,
  getQuestionLibrary,
  setJobQuestions,
  updateQuestion,
} from '@/lib/api/jobs';
import type { JobPostingQuestionDto, JobQuestionDto } from '@/shared/dto/jobs.dto';
import { JobQuestionKind } from '@/shared/enums';
import { describeError } from '@/lib/api/errors';

const KIND_LABEL: Record<JobQuestionKind, string> = {
  [JobQuestionKind.TEXT]: 'Short text',
  [JobQuestionKind.LONG_TEXT]: 'Paragraph',
  [JobQuestionKind.NUMBER]: 'Number',
  [JobQuestionKind.EMAIL]: 'Email',
  [JobQuestionKind.PHONE]: 'Phone',
  [JobQuestionKind.DATE]: 'Date',
  [JobQuestionKind.SELECT]: 'Choose one',
  [JobQuestionKind.MULTI_SELECT]: 'Choose many',
  [JobQuestionKind.URL]: 'Link',
};

/**
 * What applicants are asked.
 *
 * "Required" lives on the SELECTION, not the question, because the same question is
 * mandatory on one posting and optional on another - so ticking a box here never
 * changes another job's form.
 *
 * The library is shared and additive on purpose: an admin writing "Notice period" once
 * should find it waiting on the next posting rather than retyping it.
 */
export function QuestionPicker({ jobId }: { jobId: string }) {
  const [library, setLibrary] = useState<JobQuestionDto[]>([]);
  const [selected, setSelected] = useState<JobPostingQuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [helpText, setHelpText] = useState('');
  const [kind, setKind] = useState<JobQuestionKind>(JobQuestionKind.TEXT);
  const [options, setOptions] = useState('');

  const reload = async () => {
    const [lib, mine] = await Promise.all([getQuestionLibrary(), getJobQuestions(jobId)]);
    setLibrary(lib);
    setSelected(mine);
  };

  useEffect(() => {
    reload()
      .catch((err) => toast.error(describeError(err, 'Could not load the questions.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const commit = async (next: Array<{ questionId: string; isRequired: boolean }>) => {
    setSaving(true);
    try {
      const saved = await setJobQuestions(
        jobId,
        next.map((q, i) => ({ ...q, sortOrder: i })),
      );
      setSelected(saved);
    } catch (err) {
      toast.error(describeError(err, 'Could not save the questions.'));
    } finally {
      setSaving(false);
    }
  };

  const isOn = (id: string) => selected.some((s) => s.id === id);
  const requiredOf = (id: string) => selected.find((s) => s.id === id)?.isRequired ?? false;

  const toggle = (id: string) => {
    const next = isOn(id)
      ? selected.filter((s) => s.id !== id)
      : [...selected, { id, isRequired: false } as JobPostingQuestionDto];
    void commit(next.map((s) => ({ questionId: s.id, isRequired: s.isRequired ?? false })));
  };

  const setRequired = (id: string, required: boolean) =>
    void commit(
      selected.map((s) => ({ questionId: s.id, isRequired: s.id === id ? required : s.isRequired })),
    );

  const resetForm = () => {
    setLabel('');
    setHelpText('');
    setOptions('');
    setKind(JobQuestionKind.TEXT);
    setAdding(false);
    setEditingId(null);
  };

  const startEdit = (q: JobQuestionDto) => {
    setEditingId(q.id);
    setAdding(false);
    setLabel(q.label);
    setHelpText(q.helpText ?? '');
    setKind(q.kind);
    setOptions((q.options ?? []).join('\n'));
  };

  const saveQuestion = async () => {
    if (label.trim().length < 2) return;
    const dto = {
      label: label.trim(),
      helpText: helpText.trim() || undefined,
      kind,
      options:
        kind === JobQuestionKind.SELECT || kind === JobQuestionKind.MULTI_SELECT
          ? options.split('\n').map((o) => o.trim()).filter(Boolean)
          : undefined,
    };
    setSaving(true);
    try {
      if (editingId) {
        // Editing an existing library question - persist the wording change and stop.
        // Never re-tick or reorder: a fix to the question text is unrelated to which
        // postings ask it or in what order.
        await updateQuestion(editingId, dto);
        resetForm();
        await reload();
      } else {
        const q = await createQuestion(dto);
        resetForm();
        await reload();
        // A question an admin just wrote is one they want on THIS posting.
        void commit([
          ...selected.map((s) => ({ questionId: s.id, isRequired: s.isRequired })),
          { questionId: q.id, isRequired: false },
        ]);
      }
    } catch (err) {
      toast.error(
        describeError(err, editingId ? 'Could not save the question.' : 'Could not add the question.'),
      );
    } finally {
      setSaving(false);
    }
  };

  // Reorder the SELECTED questions - the order applicants see them. commit() re-stamps
  // sortOrder by array index, so swapping two entries is the whole operation; no BE
  // reorder route is needed.
  const move = (index: number, dir: -1 | 1) => {
    const next = [...selected];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    void commit(next.map((s) => ({ questionId: s.id, isRequired: s.isRequired })));
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">
        Tick what applicants must fill in. A posting that asks nothing still collects the
        student&apos;s ZSkillup profile - these are the extras on top.
      </p>

      {selected.length > 1 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Order on the form
          </p>
          <ul className="mt-2 space-y-1.5">
            {selected.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                  {i + 1}. {s.label}
                </span>
                {s.isRequired ? (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-orange">
                    Required
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Move ${s.label} up`}
                  disabled={saving || i === 0}
                  onClick={() => move(i, -1)}
                  className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-navy disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${s.label} down`}
                  disabled={saving || i === selected.length - 1}
                  onClick={() => move(i, 1)}
                  className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-navy disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {library.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center gap-3 p-3.5">
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <input
                type="checkbox"
                checked={isOn(q.id)}
                onChange={() => toggle(q.id)}
                disabled={saving}
                className="size-4 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/40"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-navy">{q.label}</span>
                <span className="text-xs text-slate-400">{KIND_LABEL[q.kind]}</span>
              </span>
            </label>

            {isOn(q.id) ? (
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={requiredOf(q.id)}
                  onChange={(e) => setRequired(q.id, e.target.checked)}
                  disabled={saving}
                  className="size-3.5 rounded border-slate-300 text-orange focus-visible:ring-2 focus-visible:ring-orange/40"
                />
                Required
              </label>
            ) : null}

            {!q.isBuiltin ? (
              <button
                type="button"
                aria-label={`Edit ${q.label}`}
                onClick={() => startEdit(q)}
                className="text-slate-300 transition-colors hover:text-navy"
              >
                <Pencil className="size-4" />
              </button>
            ) : null}

            {!q.isBuiltin ? (
              <button
                type="button"
                aria-label={`Delete ${q.label} from the library`}
                onClick={async () => {
                  if (!window.confirm(`Remove "${q.label}" from the library for every future job?`))
                    return;
                  try {
                    await deleteQuestion(q.id);
                    await reload();
                  } catch (err) {
                    toast.error(describeError(err, 'Could not remove it.'));
                  }
                }}
                className="text-slate-300 transition-colors hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {adding || editingId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-base font-bold text-navy">
            {editingId ? 'Edit question' : 'New question'}
          </p>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Question
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Notice period"
              maxLength={255}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Help text <span className="normal-case text-slate-300">· optional</span>
            </span>
            <input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Shown under the field - e.g. In days, from an offer"
              maxLength={255}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Answer type
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as JobQuestionKind)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              {Object.values(JobQuestionKind).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          {kind === JobQuestionKind.SELECT || kind === JobQuestionKind.MULTI_SELECT ? (
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Options - one per line, at least two
              </span>
              <textarea
                rows={4}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30"
              />
            </label>
          ) : null}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} disabled={saving || label.trim().length < 2}>
              {editingId ? 'Save changes' : 'Add question'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add a custom question
        </Button>
      )}
    </div>
  );
}
