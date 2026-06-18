'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  createAdminTip,
  deleteAdminTip,
  listAdminTips,
  updateAdminTip,
  type AdminTip,
  type AdminTipInput,
} from '@/lib/api/tips';
import { Lightbulb, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

const EMPTY: AdminTipInput = {
  code: '',
  title: '',
  body: '',
  category: '',
  ctaLabel: '',
  ctaHref: '',
  icon: 'Lightbulb',
  isActive: true,
  priority: 0,
};

export default function AdminTipsPage() {
  const [tips, setTips] = useState<AdminTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminTip | null>(null);
  const [draft, setDraft] = useState<AdminTipInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTips(await listAdminTips());
    } catch {
      setError('Failed to load tips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...EMPTY });
  };
  const openEdit = (t: AdminTip) => {
    setEditing(t);
    setDraft({
      code: t.code,
      title: t.title,
      body: t.body,
      category: t.category ?? '',
      ctaLabel: t.ctaLabel ?? '',
      ctaHref: t.ctaHref ?? '',
      icon: t.icon ?? '',
      isActive: t.isActive,
      priority: t.priority,
    });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { code: _code, ...patch } = draft;
        void _code;
        await updateAdminTip(editing.id, patch);
      } else {
        await createAdminTip(draft);
      }
      setDraft(null);
      setEditing(null);
      await load();
    } catch {
      setError('Save failed. Check the fields (code must be unique) and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: AdminTip) => {
    await updateAdminTip(t.id, { isActive: !t.isActive });
    await load();
  };

  const remove = async (t: AdminTip) => {
    if (!confirm(`Delete tip "${t.title}"?`)) return;
    await deleteAdminTip(t.id);
    await load();
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Tips' },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Today&apos;s Tips</h1>
          <p className="mt-1 text-sm text-slate-500">
            {tips.length} tips · rotated per student per day on the dashboard
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
        >
          <Plus className="size-4" /> New tip
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Editor */}
      {draft ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy">{editing ? 'Edit tip' : 'New tip'}</h2>
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
                placeholder="consistency-beats-cramming"
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category ?? ''}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className={INPUT}
                placeholder="Strategy"
              />
            </Field>
            <Field label="Title" full>
              <input
                value={draft.title ?? ''}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={INPUT}
                placeholder="Consistency beats cramming"
              />
            </Field>
            <Field label="Body" full>
              <textarea
                value={draft.body ?? ''}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={3}
                className={`${INPUT} resize-y`}
                placeholder="Twenty focused minutes a day…"
              />
            </Field>
            <Field label="CTA label">
              <input
                value={draft.ctaLabel ?? ''}
                onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                className={INPUT}
                placeholder="Practice now"
              />
            </Field>
            <Field label="CTA href">
              <input
                value={draft.ctaHref ?? ''}
                onChange={(e) => setDraft({ ...draft, ctaHref: e.target.value })}
                className={INPUT}
                placeholder="/practice"
              />
            </Field>
            <Field label="Icon (lucide name)">
              <input
                value={draft.icon ?? ''}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                className={INPUT}
                placeholder="Lightbulb"
              />
            </Field>
            <Field label="Priority">
              <input
                type="number"
                value={draft.priority ?? 0}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
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

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : tips.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No tips yet — create one.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tips.map((t) => (
              <li key={t.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/60">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Lightbulb className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{t.title}</p>
                    {t.category ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {t.category}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] text-slate-400">prio {t.priority}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{t.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(t)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    {t.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(t)}
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
