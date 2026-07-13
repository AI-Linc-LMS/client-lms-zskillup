'use client';

import { useCallback, useEffect, useState } from 'react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, XCircle } from 'lucide-react';
import {
  approveCollegeRequest,
  getCollegeRequest,
  listCollegeRequests,
  rejectCollegeRequest,
  type CollegeRequestDetail,
  type CollegeRequestSummary,
} from '@/lib/api/college-requests';
import { STATUS_STYLE } from '@/lib/college-request-status';

export default function SuperAdminCollegeRequestsPage() {
  const [rows, setRows] = useState<CollegeRequestSummary[] | null>(null);
  const [status, setStatus] = useState('SUBMITTED');
  const [selected, setSelected] = useState<CollegeRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    listCollegeRequests(status || undefined)
      .then(setRows)
      .catch(() => setRows([]));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id: string) {
    setDetailLoading(true);
    setError(null);
    setNotice(null);
    setRejecting(false);
    setReason('');
    try {
      setSelected(await getCollegeRequest(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load request');
    } finally {
      setDetailLoading(false);
    }
  }

  async function onApprove() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await approveCollegeRequest(selected.id);
      setSelected(updated);
      setNotice('Approved - the college was created.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not approve');
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!selected || reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await rejectCollegeRequest(selected.id, reason.trim());
      setSelected(updated);
      setRejecting(false);
      setReason('');
      setNotice('Rejected - the admin can correct and resubmit.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reject');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Super Admin', href: '/superadmin/dashboard' }, { label: 'College Requests' }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Super Admin · Onboarding</p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-navy">College Registration Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review submitted requests - approve to create the college, or send back with a reason.</p>
        </div>
        <div className="relative w-48">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm shadow-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="">All</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Queue */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows === null ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">Nothing here.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => open(r.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 ${selected?.id === r.id ? 'bg-orange/5' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-navy">{r.collegeName}</p>
                      <p className="text-xs text-slate-400">{r.city}, {r.state} · {r.studentCount} students · {r.planName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? ''}`}>{r.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detail + review */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : !selected ? (
            <div className="py-16 text-center text-sm text-slate-400">Select a request to review.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-extrabold text-navy">{selected.collegeName}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[selected.status] ?? ''}`}>{selected.status}</span>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                <Info k="Slug" v={selected.collegeSlug} />
                <Info k="Location" v={`${selected.city}, ${selected.state}`} />
                <Info k="TPO contact" v={`${selected.contactName} · ${selected.contactEmail}`} />
                <Info k="Plan" v={`${selected.planName} · ${selected.seatLimit} seats${selected.durationMonths ? ` · ${selected.durationMonths} mo` : ''}`} />
                <Info k="Students" v={String(selected.studentCount)} />
                {selected.collegeId ? <Info k="Created college" v={selected.collegeId} /> : null}
              </dl>

              {selected.rejectionReason ? (
                <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-200">
                  <span className="font-bold">Rejection reason:</span> {selected.rejectionReason}
                </p>
              ) : null}

              <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Email</th>
                      <th className="px-3 py-1.5 text-left">Name</th>
                      <th className="px-3 py-1.5 text-left">Roll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.students.slice(0, 100).map((s, i) => (
                      <tr key={`${s.email}-${i}`} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-medium text-navy">{s.email}</td>
                        <td className="px-3 py-1.5 text-slate-600">{s.fullName ?? '-'}</td>
                        <td className="px-3 py-1.5 text-slate-500">{s.rollNumber ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.students.length > 100 ? (
                  <p className="px-3 py-1.5 text-[11px] text-slate-400">…and {selected.students.length - 100} more</p>
                ) : null}
              </div>

              {notice ? (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="size-4 shrink-0" /> {notice}
                </p>
              ) : null}
              {error ? (
                <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                  <AlertCircle className="size-4 shrink-0" /> {error}
                </p>
              ) : null}

              {selected.status === 'SUBMITTED' ? (
                rejecting ? (
                  <div className="space-y-2">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for rejection (the admin will see this)…"
                      className="h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={onReject}>
                        {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <XCircle className="mr-1.5 size-4" />}
                        Confirm reject
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={() => setRejecting(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button disabled={busy} onClick={onApprove}>
                      {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 size-4" />}
                      Approve & create college
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)}>Reject…</Button>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
      <dd className="mt-0.5 break-words text-sm text-navy">{v}</dd>
    </div>
  );
}
