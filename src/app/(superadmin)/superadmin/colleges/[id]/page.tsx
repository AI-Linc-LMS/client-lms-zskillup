'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { CollegeSubscriptionScopeCard } from '@/components/admin/CollegeSubscriptionScopeCard';
import { getAdminCollegeDetail, type AdminCollegeDetail } from '@/lib/api/admin';

/**
 * Super-admin college detail. Exists so a SUPER_ADMIN can manage a college's
 * subscription: middleware redirects them away from /admin/* (role-exact route
 * groups), so the Platform Admin's college page is unreachable for them, and the
 * spec requires the subscription to be editable by BOTH roles.
 */
export default function SuperadminCollegeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
          { label: 'Super Admin', href: '/superadmin/dashboard' },
          { label: 'Colleges', href: '/superadmin/colleges' },
          { label: detail?.college.name ?? 'College' },
        ]}
      />
      <Link
        href="/superadmin/colleges"
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
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}
              >
                {detail.college.status}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Kpi label="Students" value={detail.studentCount} />
              <Kpi label="Active" value={detail.activeStudentCount} />
              <Kpi label="Invited" value={detail.invitedStudentCount} />
              <Kpi label="Cohorts" value={detail.cohortCount} />
            </dl>
          </section>

          <CollegeSubscriptionScopeCard collegeId={id} />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-extrabold tabular-nums text-navy">{value}</dd>
    </div>
  );
}
