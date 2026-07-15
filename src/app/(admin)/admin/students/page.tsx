'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { listStudentReports, type AdminStudentReportRow } from '@/lib/api/admin';
import { BarChart3, Loader2, Search } from 'lucide-react';

const PAGE_SIZE = 25;

/** Admin console — read-only student performance roster (Phase 2 insights). */
export default function AdminStudentsPage() {
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
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Student Reports' },
        ]}
      />
      <ConsoleHero
        icon={BarChart3}
        eyebrow="Platform Admin"
        title="Student reports"
        description={
          <>
            {total.toLocaleString()} students · mock performance at a glance
          </>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-[#f5b400] focus:outline-none focus:ring-1 focus:ring-[#f5b400]"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">College</th>
                  <th className="px-4 py-3 text-right">Attempts</th>
                  <th className="px-4 py-3 text-right">Avg %</th>
                  <th className="px-4 py-3 text-right">Best %</th>
                  <th className="px-4 py-3">Last attempt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/students/${r.id}`} className="group">
                        <p className="font-semibold text-navy group-hover:text-[#1a1a1a]">
                          {r.fullName ?? '-'}
                        </p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.collegeName ?? '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{r.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {r.avgScorePct ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {r.bestScorePct ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.lastAttemptAt
                        ? new Date(r.lastAttemptAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
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
