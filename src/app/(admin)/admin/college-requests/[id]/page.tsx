'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, Users } from 'lucide-react';
import {
  CollegeRequestForm,
  toCreateBody,
  type CollegeRequestFormValue,
} from '@/components/admin/CollegeRequestForm';
import {
  activateCollegeRequest,
  getCollegeRequest,
  importRequestStudents,
  resendCollegeCredentials,
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
              <span><span className="font-bold">Rejected:</span> {req.rejectionReason} - fix the details below and resubmit.</span>
            </p>
          ) : null}

          {req.status === 'APPROVED' ? <ActivationPanel req={req} onChange={setReq} /> : null}
          {req.status === 'APPROVED' && req.activatedAt ? (
            <StudentImportPanel req={req} onChange={setReq} />
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

function ActivationPanel({
  req,
  onChange,
}: {
  req: CollegeRequestDetail;
  onChange: (r: CollegeRequestDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const activated = Boolean(req.activatedAt);

  async function run(fn: () => Promise<CollegeRequestDetail>, okMsg: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      onChange(await fn());
      setMsg(okMsg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-navy">Approved - college created</p>
          {activated ? (
            <p className="mt-0.5 text-xs text-slate-600">
              Subscription activated
              {req.activatedAt ? ` on ${new Date(req.activatedAt).toLocaleDateString()}` : ''} · set-password
              link emailed to <span className="font-semibold">{req.contactEmail}</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-600">
              Activate the subscription to provision the college admin ({req.contactEmail}) and email their
              secure set-password link.
            </p>
          )}

          {msg ? <p className="mt-2 text-xs font-semibold text-emerald-700">{msg}</p> : null}
          {err ? <p className="mt-2 text-xs font-semibold text-red-600">{err}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {!activated ? (
              <Button
                disabled={busy}
                onClick={() => run(() => activateCollegeRequest(req.id), 'Activated - credentials emailed.')}
              >
                {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <KeyRound className="mr-1.5 size-4" />}
                Activate subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(() => resendCollegeCredentials(req.id), 'Set-password link re-sent.')}
              >
                {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Mail className="mr-1.5 size-4" />}
                Resend credentials
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StudentImportPanel({
  req,
  onChange,
}: {
  req: CollegeRequestDetail;
  onChange: (r: CollegeRequestDetail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [cohortName, setCohortName] = useState('');
  const imported = Boolean(req.studentsImportedAt);

  async function onImport() {
    setBusy(true);
    setErr(null);
    try {
      const res = await importRequestStudents(req.id, { cohortName: cohortName.trim() || undefined });
      onChange(res.request);
      setResult({ created: res.result.created, skipped: res.result.skipped });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff5ea] text-[#f5b400] ring-1 ring-[#ffc42d]/30">
          <Users className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-navy">Import students</p>
          {imported ? (
            <p className="mt-0.5 text-xs text-slate-600">
              Seeded on {req.studentsImportedAt ? new Date(req.studentsImportedAt).toLocaleDateString() : ''} -
              {' '}students were created and emailed their set-password links.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-600">
              One-time: create a cohort from this request&apos;s {req.studentCount} students and email each a
              secure set-password link. The college can import more later from their console.
            </p>
          )}

          {result ? (
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              {result.created} invited · {result.skipped} skipped (already registered).
            </p>
          ) : null}
          {err ? <p className="mt-2 text-xs font-semibold text-red-600">{err}</p> : null}

          {!imported ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Cohort name (optional)</span>
                <input
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  placeholder={`${req.collegeName} - ${new Date().getFullYear()}`}
                  className="mt-1 block w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </label>
              <Button disabled={busy || req.studentCount === 0} onClick={onImport}>
                {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Users className="mr-1.5 size-4" />}
                Import {req.studentCount} students
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
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
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="mt-0.5 text-sm text-navy">{v}</dd>
            </div>
          ))}
        </dl>
        {req.status === 'SUBMITTED' ? (
          <p className="mt-4 text-xs text-slate-500">Awaiting Super Admin review - you&apos;ll be able to edit again if it&apos;s sent back.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
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
                  <td className="px-3 py-1.5 text-slate-600">{s.fullName ?? '-'}</td>
                  <td className="px-3 py-1.5 text-slate-500">{s.rollNumber ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
