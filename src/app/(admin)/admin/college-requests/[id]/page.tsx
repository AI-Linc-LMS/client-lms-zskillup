'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import {
  CollegeRequestForm,
  toCreateBody,
  type CollegeRequestFormValue,
} from '@/components/admin/CollegeRequestForm';
import {
  getCollegeRequest,
  submitCollegeRequest,
  updateCollegeRequest,
  type CollegeRequestDetail,
} from '@/lib/api/college-requests';
import { STATUS_STYLE } from '@/lib/college-request-status';

export default function CollegeRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [req, setReq] = useState<CollegeRequestDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCollegeRequest(id)
      .then((r) => !cancelled && setReq(r))
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Failed to load'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const editable = req?.status === 'DRAFT' || req?.status === 'REJECTED';

  async function onSave(value: CollegeRequestFormValue, mode: 'draft' | 'submit') {
    setBusy(true);
    setError(null);
    try {
      await updateCollegeRequest(id, toCreateBody(value));
      if (mode === 'submit') await submitCollegeRequest(id);
      const fresh = await getCollegeRequest(id);
      setReq(fresh);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Platform Admin', href: '/admin/dashboard' },
          { label: 'College Requests', href: '/admin/college-requests' },
          { label: req?.collegeName ?? 'Request' },
        ]}
      />

      <Link href="/admin/college-requests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft className="size-4" /> All requests
      </Link>

      {loadError ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{loadError}</p>
      ) : !req ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[28px] font-extrabold tracking-tight text-navy">{req.collegeName}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[req.status] ?? ''}`}>{req.status}</span>
          </div>

          {req.status === 'REJECTED' && req.rejectionReason ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span><span className="font-bold">Rejected:</span> {req.rejectionReason} — fix the details below and resubmit.</span>
            </p>
          ) : null}

          {req.status === 'APPROVED' ? (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-4 shrink-0" /> Approved — the college has been created. Subscription activation is the next step.
            </p>
          ) : null}

          {editable ? (
            <CollegeRequestForm
              busy={busy}
              error={error}
              onSave={onSave}
              primaryLabel={req.status === 'REJECTED' ? 'Save & resubmit' : 'Save & submit for review'}
              initial={{
                collegeName: req.collegeName,
                collegeSlug: req.collegeSlug,
                state: req.state,
                city: req.city,
                logoUrl: req.logoUrl ?? '',
                contactName: req.contactName,
                contactEmail: req.contactEmail,
                planName: req.planName,
                seatLimit: req.seatLimit,
                durationMonths: req.durationMonths ?? '',
                students: req.students.map((s) => ({
                  email: s.email,
                  fullName: s.fullName ?? undefined,
                  rollNumber: s.rollNumber ?? undefined,
                })),
              }}
            />
          ) : (
            <ReadOnlyRequest req={req} />
          )}
        </>
      )}
    </div>
  );
}

function ReadOnlyRequest({ req }: { req: CollegeRequestDetail }) {
  const rows: Array<[string, string]> = [
    ['College', `${req.collegeName} (${req.collegeSlug})`],
    ['Location', `${req.city}, ${req.state}`],
    ['TPO contact', `${req.contactName} · ${req.contactEmail}`],
    ['Plan', `${req.planName} · ${req.seatLimit} seats${req.durationMonths ? ` · ${req.durationMonths} mo` : ''}`],
    ['Students', String(req.studentCount)],
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-sm text-navy">{v}</dd>
            </div>
          ))}
        </dl>
        {req.status === 'SUBMITTED' ? (
          <p className="mt-4 text-xs text-slate-500">Awaiting Super Admin review — you&apos;ll be able to edit again if it&apos;s sent back.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-navy">Student list ({req.students.length})</h2>
        <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-3 py-1.5 text-left">Email</th>
                <th className="px-3 py-1.5 text-left">Name</th>
                <th className="px-3 py-1.5 text-left">Roll</th>
              </tr>
            </thead>
            <tbody>
              {req.students.map((s, i) => (
                <tr key={`${s.email}-${i}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-medium text-navy">{s.email}</td>
                  <td className="px-3 py-1.5 text-slate-600">{s.fullName ?? '—'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{s.rollNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
