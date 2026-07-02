'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { createCohort, listCohorts, type Cohort } from '@/lib/api/cohorts';

/**
 * TPO cohorts — create and view the college's batches. Students are imported into
 * a cohort from the bulk-invite page; counts here are live.
 */
export default function TpoCohortsPage() {
  const [rows, setRows] = useState<Cohort[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    setError(null);
    listCohorts()
      .then(setRows)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load cohorts');
        setRows([]);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate() {
    if (name.trim().length < 2) return;
    setBusy(true);
    setFormErr(null);
    try {
      await createCohort({
        name: name.trim(),
        year: year ? Number(year) : undefined,
        branch: branch.trim() || undefined,
      });
      setName('');
      setYear('');
      setBranch('');
      load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : 'Could not create cohort');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Placement Office', href: '/tpo/dashboard' }, { label: 'Cohorts' }]} />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">TPO Console</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">Cohorts</h1>
        <p className="mt-1 text-sm text-slate-500">Group students into batches, then import students into a cohort from the invitations page.</p>
      </div>

      {/* Create */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-navy">New cohort</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Name</span>
            <input className={`mt-1 block w-56 ${inputCls}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="2026 Passouts" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Year</span>
            <input type="number" className={`mt-1 block w-28 ${inputCls}`} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Branch (optional)</span>
            <input className={`mt-1 block w-36 ${inputCls}`} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
          </label>
          <Button disabled={busy || name.trim().length < 2} onClick={onCreate}>
            {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Create cohort
          </Button>
        </div>
        {formErr ? <p className="mt-2 text-xs font-semibold text-red-600">{formErr}</p> : null}
      </section>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows === null ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No cohorts yet. Create one above.</div>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Students</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-navy">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.year ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.branch ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 tabular-nums text-slate-600">
                      <Users className="size-3.5 text-slate-400" /> {c.studentCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
