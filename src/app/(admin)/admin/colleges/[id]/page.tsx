'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getAdminCollegeDetail, type AdminCollegeDetail } from '@/lib/api/admin';
import { CollegeCohortsManager } from '@/components/admin/CollegeCohortsManager';
import { CollegeSubscriptionScopeCard } from '@/components/admin/CollegeSubscriptionScopeCard';
import { CollegePerformancePanel } from '@/components/admin/CollegePerformancePanel';
import { ArrowLeft, Loader2 } from 'lucide-react';

/** Admin console - college detail: identity, enrolment + performance, roster. */
export default function AdminCollegeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<AdminCollegeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setDetail(await getAdminCollegeDetail(id));
    } catch {
      setError('Failed to load this college.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to colleges
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      ) : error || !detail ? (
        <div className="py-24 text-center text-sm text-red-500">{error ?? 'Not found.'}</div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-navy">
                  {detail.college.name}
                </h1>
                <p className="text-sm text-slate-600">
                  {[detail.college.city, detail.college.state].filter(Boolean).join(', ') || '-'}
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
              <Kpi label="Avg %" value={detail.avgScorePct ?? '-'} />
            </dl>
          </section>

          {/* TPO Panel View — the same college performance & participation analytics a
              TPO sees, + email the report to the college. */}
          <CollegePerformancePanel collegeId={id} />

          {/* What this college bought - and what every one of its students inherits. */}
          <CollegeSubscriptionScopeCard collegeId={id} />

          {/* Cohorts + student invitations - Platform Admin manages these (TPO is read-only). */}
          <CollegeCohortsManager collegeId={id} onChange={() => void reload()} />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-navy tabular-nums">{value}</p>
    </div>
  );
}
