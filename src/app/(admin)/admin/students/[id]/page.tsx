'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getStudentReport, type AdminStudentFullReport } from '@/lib/api/admin';
import { ArrowLeft, BadgeCheck, Loader2, XCircle } from 'lucide-react';

/** Admin console — read-only per-student report (Phase 2 insights). */
export default function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<AdminStudentFullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getStudentReport(id);
        if (alive) setReport(data);
      } catch {
        if (alive) setError('Failed to load this student report.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'Student Reports', href: '/admin/students' },
          { label: report?.student.fullName ?? 'Student' },
        ]}
      />
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to student reports
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : error || !report ? (
        <div className="py-24 text-center text-sm text-red-500">{error ?? 'Not found.'}</div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-navy">
                  {report.student.fullName ?? '—'}
                </h1>
                <p className="text-sm text-slate-500">{report.student.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                    {report.student.status}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold ${
                      report.student.isEmailVerified
                        ? 'bg-green-50 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {report.student.isEmailVerified ? (
                      <BadgeCheck className="size-3" />
                    ) : (
                      <XCircle className="size-3" />
                    )}
                    {report.student.isEmailVerified ? 'Verified' : 'Unverified'}
                  </span>
                  {report.student.collegeName && (
                    <span className="text-slate-500">{report.student.collegeName}</span>
                  )}
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Quizzes" value={report.summary.totalAttempts} />
              <Kpi label="Avg %" value={report.summary.avgScorePct ?? '—'} />
              <Kpi label="Best %" value={report.summary.bestScorePct ?? '—'} />
              <Kpi
                label="Time"
                value={`${Math.round(report.summary.totalTimeSec / 60)}m`}
              />
              <Kpi label="Practice" value={report.summary.practiceAttempts} />
              <Kpi label="Adaptive" value={report.summary.adaptiveSessions} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-navy">Quiz attempts</h2>
            </div>
            {report.mockAttempts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">No attempts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Mock</th>
                      <th className="px-4 py-3 text-right">Score</th>
                      <th className="px-4 py-3 text-right">%</th>
                      <th className="px-4 py-3 text-right">Percentile</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.mockAttempts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-navy">{a.mockTitle}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {a.score ?? '—'}
                          {a.total != null ? ` / ${a.total}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {a.percentage ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {a.percentile ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{a.status}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {a.submittedAt
                            ? new Date(a.submittedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-navy tabular-nums">{value}</p>
    </div>
  );
}
