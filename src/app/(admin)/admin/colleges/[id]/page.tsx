'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  getAdminCollegeDetail,
  listStudentReports,
  type AdminCollegeDetail,
  type AdminStudentReportRow,
} from '@/lib/api/admin';
import { ArrowLeft, Loader2 } from 'lucide-react';

/** Admin console — college detail: identity, enrolment + performance, roster. */
export default function AdminCollegeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<AdminCollegeDetail | null>(null);
  const [students, setStudents] = useState<AdminStudentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [d, roster] = await Promise.all([
          getAdminCollegeDetail(id),
          listStudentReports({ collegeId: id, limit: 100 }),
        ]);
        if (alive) {
          setDetail(d);
          setStudents(roster.rows);
        }
      } catch {
        if (alive) setError('Failed to load this college.');
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
          { label: 'Colleges', href: '/admin/colleges' },
          { label: detail?.college.name ?? 'College' },
        ]}
      />
      <Link
        href="/admin/colleges"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to colleges
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : error || !detail ? (
        <div className="py-24 text-center text-sm text-red-500">{error ?? 'Not found.'}</div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-navy">
                  {detail.college.name}
                </h1>
                <p className="text-sm text-slate-500">
                  {[detail.college.city, detail.college.state].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  detail.college.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {detail.college.status}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi label="Students" value={detail.studentCount} />
              <Kpi label="Active" value={detail.activeStudentCount} />
              <Kpi label="Invited" value={detail.invitedStudentCount} />
              <Kpi label="Cohorts" value={detail.cohortCount} />
              <Kpi label="Mock attempts" value={detail.mockAttempts} />
              <Kpi label="Avg %" value={detail.avgScorePct ?? '—'} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-navy">
                Students {students.length > 0 && `(${students.length})`}
              </h2>
            </div>
            {students.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No students enrolled at this college yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3 text-right">Attempts</th>
                      <th className="px-4 py-3 text-right">Avg %</th>
                      <th className="px-4 py-3 text-right">Best %</th>
                      <th className="px-4 py-3">Last attempt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/students/${s.id}`} className="group">
                            <p className="font-semibold text-navy group-hover:text-orange">
                              {s.fullName ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {s.attempts}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {s.avgScorePct ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {s.bestScorePct ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {s.lastAttemptAt
                            ? new Date(s.lastAttemptAt).toLocaleDateString('en-IN', {
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
