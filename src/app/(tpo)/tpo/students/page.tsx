'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Mail, Search } from 'lucide-react';
import { getTpoAnalytics } from '@/lib/api/tpo';
import type { ReadinessBand, TpoDashboard, TpoStudentRow } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { ReadinessBadge } from '@/components/tpo/ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
type SortKey = 'name' | 'branch' | 'readiness' | 'participation' | 'lastActive';

const BANDS: { value: ReadinessBand | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'READY', label: 'Ready' },
  { value: 'IN_TRAINING', label: 'In training' },
  { value: 'AT_RISK', label: 'At risk' },
];

const ACTIVITY = [
  { value: '', label: 'Any activity' },
  { value: '7', label: 'Active ≤ 7 days' },
  { value: '30', label: 'Active ≤ 30 days' },
  { value: 'inactive', label: 'Inactive 30+ days' },
];

export default function StudentManagementPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [band, setBand] = useState<ReadinessBand | ''>('');
  const [activity, setActivity] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'readiness', dir: 'desc' });
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoAnalytics(cohortId || undefined)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, branch, band, activity, cohortId]);

  const cohortName = useMemo(() => new Map(cohorts.map((c) => [c.id, c.name])), [cohorts]);
  const branches = useMemo(
    () => [...new Set((data?.students ?? []).map((s) => s.branch).filter(Boolean) as string[])].sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const rows = (data?.students ?? []).filter((s) => {
      if (q && !`${s.name ?? ''} ${s.email} ${s.rollNumber ?? ''}`.toLowerCase().includes(q)) return false;
      if (branch && s.branch !== branch) return false;
      if (band && s.band !== band) return false;
      if (activity) {
        const days = s.lastActiveDate ? (now - new Date(s.lastActiveDate).getTime()) / 86_400_000 : Infinity;
        if (activity === '7' && days > 7) return false;
        if (activity === '30' && days > 30) return false;
        if (activity === 'inactive' && days <= 30) return false;
      }
      return true;
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return dir * (a.name ?? a.email).localeCompare(b.name ?? b.email);
        case 'branch':
          return dir * (a.branch ?? '').localeCompare(b.branch ?? '');
        case 'participation':
          return dir * (a.participation - b.participation);
        case 'lastActive':
          return dir * ((a.lastActiveDate ? +new Date(a.lastActiveDate) : 0) - (b.lastActiveDate ? +new Date(b.lastActiveDate) : 0));
        default:
          return dir * (a.readiness - b.readiness);
      }
    });
  }, [data, query, branch, band, activity, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-400" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Student Directory · <span className="text-navy">{filtered.length}</span> students
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/tpo/invitations">
            <Mail className="size-4" /> Invite more
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, email or roll no…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectCls}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={band} onChange={(e) => setBand(e.target.value as ReadinessBand | '')} className={selectCls}>
          {BANDS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className={selectCls}>
          {ACTIVITY.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              <tr>
                <Th label="Student" onClick={() => toggleSort('name')} active={sort.key === 'name'} />
                <th className="px-4 py-2.5">Roll no.</th>
                <Th label="Branch" onClick={() => toggleSort('branch')} active={sort.key === 'branch'} />
                <th className="px-4 py-2.5">Batch</th>
                <Th label="Readiness" onClick={() => toggleSort('readiness')} active={sort.key === 'readiness'} />
                <th className="px-4 py-2.5">Status</th>
                <Th label="Last active" onClick={() => toggleSort('lastActive')} active={sort.key === 'lastActive'} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((s) => (
                <StudentRow key={s.id} s={s} cohortName={s.cohortId ? cohortName.get(s.cohortId) ?? null : null} />
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    No students match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Page <span className="font-bold text-navy">{page}</span> of {pageCount}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:enabled:bg-slate-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:enabled:bg-slate-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
      {data?.truncated ? (
        <p className="text-[11px] text-slate-400">Showing the first 5,000 students for this scope.</p>
      ) : null}
    </div>
  );
}

const selectCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange';

function Th({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <th className="px-4 py-2.5">
      <button
        type="button"
        onClick={onClick}
        className={cn('inline-flex items-center gap-1 hover:text-navy', active && 'text-navy')}
      >
        {label} <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}

function StudentRow({ s, cohortName }: { s: TpoStudentRow; cohortName: string | null }) {
  return (
    <tr className="transition-colors hover:bg-slate-50">
      <td className="px-4 py-2.5">
        <Link href={`/tpo/students/${s.id}`} className="group block">
          <p className="font-semibold text-navy group-hover:text-orange">{s.name ?? '—'}</p>
          <p className="truncate text-xs text-slate-400">{s.email}</p>
        </Link>
      </td>
      <td className="px-4 py-2.5 text-slate-500">{s.rollNumber ?? '—'}</td>
      <td className="px-4 py-2.5 text-slate-600">{s.branch ?? '—'}</td>
      <td className="px-4 py-2.5 text-slate-500">{cohortName ?? '—'}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-navy" style={{ width: `${s.readiness}%` }} />
          </div>
          <span className="tabular-nums text-slate-600">{s.readiness}%</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <ReadinessBadge band={s.band} />
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">
        {s.lastActiveDate ? new Date(s.lastActiveDate).toLocaleDateString('en-IN') : 'Never'}
      </td>
    </tr>
  );
}
