'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  createAdminChallenge,
  deleteAdminChallenge,
  listAdminChallenges,
  updateAdminChallenge,
  type AdminChallenge,
  type AdminChallengeInput,
  type ChallengeType,
} from '@/lib/api/challenges';
import { Code2, Loader2, Pencil, Plus, Sparkles, Swords, Trash2, X } from 'lucide-react';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

const EMPTY: AdminChallengeInput = {
  code: '',
  title: '',
  description: '',
  type: 'MCQ',
  refQuestionId: '',
  difficulty: 'MEDIUM',
  xpReward: 60,
  coinReward: 0,
  isActive: true,
};

export default function AdminChallengesPage() {
  const [rows, setRows] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminChallenge | null>(null);
  const [draft, setDraft] = useState<AdminChallengeInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAdminChallenges());
    } catch {
      setError('Failed to load challenges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (c: AdminChallenge) => {
    setEditing(c);
    setDraft({
      code: c.code,
      title: c.title,
      description: c.description ?? '',
      type: c.type,
      refQuestionId: c.refQuestionId ?? '',
      difficulty: c.difficulty ?? 'MEDIUM',
      xpReward: c.xpReward,
      coinReward: c.coinReward,
      isActive: c.isActive,
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const payload: AdminChallengeInput = {
      ...draft,
      refQuestionId: draft.refQuestionId ? draft.refQuestionId : null,
    };
    try {
      if (editing) {
        const { code: _c, ...patch } = payload;
        void _c;
        await updateAdminChallenge(editing.id, patch);
      } else {
        await createAdminChallenge(payload);
      }
      setDraft(null);
      setEditing(null);
      await load();
    } catch {
      setError('Save failed — check the code is unique and MCQ has a valid question id.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: AdminChallenge) => {
    if (!confirm(`Delete challenge "${c.title}"?`)) return;
    await deleteAdminChallenge(c.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Challenges' },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Challenges</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} challenges · MCQ now, coding lands with Judge0
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setDraft({ ...EMPTY });
          }}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-orange-600"
        >
          <Plus className="size-4" /> New challenge
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {draft ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy">{editing ? 'Edit' : 'New'} challenge</h2>
            <button onClick={() => setDraft(null)} className="text-slate-400 hover:text-slate-600">
              <X className="size-5" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code (unique)">
              <input
                value={draft.code ?? ''}
                disabled={!!editing}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                className={`${INPUT} disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </Field>
            <Field label="Type">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as ChallengeType })}
                className={INPUT}
              >
                <option value="MCQ">MCQ</option>
                <option value="CODING">Coding (Judge0 — soon)</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Title" full>
              <input
                value={draft.title ?? ''}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Description" full>
              <textarea
                value={draft.description ?? ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
                className={`${INPUT} resize-y`}
              />
            </Field>
            {draft.type === 'MCQ' ? (
              <Field label="Question id (from the bank)" full>
                <input
                  value={draft.refQuestionId ?? ''}
                  onChange={(e) => setDraft({ ...draft, refQuestionId: e.target.value })}
                  className={INPUT}
                  placeholder="UUID of a published question"
                />
              </Field>
            ) : null}
            <Field label="Difficulty">
              <select
                value={draft.difficulty ?? 'MEDIUM'}
                onChange={(e) =>
                  setDraft({ ...draft, difficulty: e.target.value as AdminChallengeInput['difficulty'] })
                }
                className={INPUT}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </Field>
            <Field label="XP reward">
              <input
                type="number"
                value={draft.xpReward ?? 60}
                onChange={(e) => setDraft({ ...draft, xpReward: Number(e.target.value) })}
                className={INPUT}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={draft.isActive ?? true}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setDraft(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No challenges yet — create one.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => (
              <li key={c.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/60">
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${
                    c.type === 'CODING'
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                      : c.type === 'OTHER'
                        ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                        : 'bg-gradient-to-br from-rose-400 to-rose-600'
                  }`}
                >
                  {c.type === 'CODING' ? <Code2 className="size-4" /> : c.type === 'OTHER' ? <Sparkles className="size-4" /> : <Swords className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{c.title}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {c.type}
                    </span>
                    {c.difficulty ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {c.difficulty}
                      </span>
                    ) : null}
                    <span className="text-[10px] font-bold text-amber-600">+{c.xpReward} XP</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {c.description ? (
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{c.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      {children}
    </label>
  );
}
