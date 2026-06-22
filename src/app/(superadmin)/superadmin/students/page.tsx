'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listStudentReports, type AdminStudentReportRow } from '@/lib/api/admin';
import { ArrowRight, GraduationCap, Loader2, Search } from 'lucide-react';

const PAGE_SIZE = 20;

function pctTone(pct: number | null): string {
  if (pct === null) return 'text-slate-400';
  if (pct >= 70) return 'text-emerald-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-500';
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminStudentsReportPage() {
  const [rows, setRows] = useState<AdminStudentReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStudentReports({
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      setError('Failed to load student reports. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Student Reports' },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Super Admin · ZSkillup
          </p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">
            Student Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {total.toLocaleString()} students · marks &amp; attempts across every quiz
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap className="size-5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">{total} students</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3 text-center">Quizzes taken</th>
                  <th className="px-4 py-3 text-center">Avg score</th>
                  <th className="px-4 py-3 text-center">Best</th>
                  <th className="px-4 py-3">Last attempt</th>
                  <th className="px-4 py-3 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/superadmin/students/${s.id}`} className="block">
                        <p className="font-semibold text-navy group-hover:underline">
                          {s.fullName ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.collegeName ?? '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-navy">{s.attempts}</td>
                    <td className={`px-4 py-3 text-center font-bold ${pctTone(s.avgScorePct)}`}>
                      {s.avgScorePct === null ? '—' : `${s.avgScorePct}%`}
                    </td>
                    <td className={`px-4 py-3 text-center font-semibold ${pctTone(s.bestScorePct)}`}>
                      {s.bestScorePct === null ? '—' : `${s.bestScorePct}%`}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(s.lastAttemptAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/superadmin/students/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-orange hover:text-orange"
                      >
                        View <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
