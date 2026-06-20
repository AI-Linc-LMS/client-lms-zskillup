'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus, Trash2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/lib/api/types';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { listAdminMocks, type AdminMockRow } from '@/lib/api/admin';
import {
  createScheduledAssessment,
  deleteScheduledAssessment,
  listScheduledAssessments,
  updateScheduledAssessment,
  type ApiScheduledAssessment,
} from '@/lib/api/scheduling';

/** Superadmin scheduler for company assessments (assessment lifecycle, Phase 2). */
export function SchedulingAdmin() {
  const [rows, setRows] = useState<ApiScheduledAssessment[] | null>(null);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [mocks, setMocks] = useState<AdminMockRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // create form
  const [companyId, setCompanyId] = useState('');
  const [mockTestId, setMockTestId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [proctored, setProctored] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () =>
    listScheduledAssessments()
      .then(setRows)
      .catch((e) => setErr(e instanceof ApiRequestError ? e.message : 'Could not load.'));

  useEffect(() => {
    void load();
    listCompanies().then(setCompanies).catch(() => {});
    listAdminMocks().then(setMocks).catch(() => {});
  }, []);

  const companyName = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const create = async () => {
    if (!companyId || !title.trim() || !scheduledAt) {
      setErr('Company, title and date/time are required.');
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      await createScheduledAssessment({
        companyId,
        mockTestId: mockTestId || undefined,
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes,
        proctored,
      });
      setTitle('');
      setScheduledAt('');
      setMockTestId('');
      await load();
    } catch (e) {
      setErr(e instanceof ApiRequestError ? e.message : 'Could not schedule.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this scheduled assessment?')) return;
    setBusyId(id);
    try {
      await deleteScheduledAssessment(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (r: ApiScheduledAssessment) => {
    setBusyId(r.id);
    try {
      await updateScheduledAssessment(r.id, { isActive: !r.isActive });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Schedule form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
          <Plus className="size-4 text-orange" /> Schedule an assessment
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className={labelCls}>Company</span>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={inputCls}>
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TCS NQT — Round 1"
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Mock test (optional)</span>
            <select value={mockTestId} onChange={(e) => setMockTestId(e.target.value)} className={inputCls}>
              <option value="">— none —</option>
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Date &amp; time</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className={labelCls}>Duration (min)</span>
            <input
              type="number"
              min={5}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={proctored}
              onChange={(e) => setProctored(e.target.checked)}
              className="size-4 accent-orange"
            />
            <span className="text-sm font-medium text-slate-600">Proctored</span>
          </label>
        </div>
        {err ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{err}</p>
        ) : null}
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="mt-4 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)] disabled:opacity-60"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : 'Schedule'}
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/90">
            <tr className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <th className="px-4 py-4">Assessment</th>
              <th className="px-4 py-4">Company</th>
              <th className="px-4 py-4">When</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Proctored</th>
              <th className="px-4 py-4">Active</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-slate-400" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                  No assessments scheduled yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100/80 hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-semibold text-navy">{r.title}</td>
                  <td className="px-4 py-3.5 text-slate-600">{companyName[r.companyId] ?? r.companyName}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {new Date(r.scheduledAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{r.durationMinutes}m</td>
                  <td className="px-4 py-3.5">
                    {r.proctored ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                        <Video className="size-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => toggleActive(r)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset disabled:opacity-50',
                        r.isActive
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 ring-slate-200',
                      )}
                    >
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => remove(r.id)}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelCls = 'text-[10px] font-bold uppercase tracking-widest text-slate-400';
const inputCls =
  'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy transition-colors focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30';
