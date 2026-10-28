'use client';

/**
 * Refund queue — rendered by BOTH /admin/refunds and /superadmin/refunds.
 *
 * One screen, two thin route files, for the reason the SEO screen does the same:
 * `navForPath` picks the sidebar from the PATHNAME, so a super-admin following a link
 * into /admin has the whole rail flip to the admin console.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import {
  approveRefund,
  listRefundRequests,
  rejectRefund,
  type AdminRefundRow,
} from '@/lib/api/refunds';
import {
  REFUND_REQUEST_STATUS,
  REFUND_REQUEST_STATUSES,
  REFUND_WINDOW_DAYS,
  type RefundRequestStatus,
} from '@/shared/refund-window';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS: Array<{ key: string; label: string }> = [
  { key: REFUND_REQUEST_STATUS.REQUESTED, label: 'Awaiting decision' },
  { key: REFUND_REQUEST_STATUS.APPROVED, label: 'Approved' },
  { key: REFUND_REQUEST_STATUS.PROCESSED, label: 'Refunded' },
  { key: REFUND_REQUEST_STATUS.FAILED, label: 'Needs retry' },
  { key: REFUND_REQUEST_STATUS.REJECTED, label: 'Declined' },
  { key: 'ALL', label: 'All' },
];

const money = (cents: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    cents / 100,
  );

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const PILL: Record<RefundRequestStatus, string> = {
  [REFUND_REQUEST_STATUS.REQUESTED]: 'bg-sky-50 text-sky-700 ring-sky-200',
  [REFUND_REQUEST_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [REFUND_REQUEST_STATUS.PROCESSED]: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  [REFUND_REQUEST_STATUS.REJECTED]: 'bg-slate-50 text-slate-600 ring-slate-200',
  [REFUND_REQUEST_STATUS.FAILED]: 'bg-red-50 text-red-700 ring-red-200',
};

export function RefundsScreen() {
  const [tab, setTab] = useState<string>(REFUND_REQUEST_STATUS.REQUESTED);
  const [rows, setRows] = useState<AdminRefundRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(
    (status: string) =>
      listRefundRequests({ status, limit: 100 })
        .then((r) => {
          setRows(r.rows);
          setCounts(r.counts);
        })
        .catch(() => setErr('Could not load refund requests.')),
    [],
  );

  useEffect(() => {
    setLoading(true);
    void load(tab).finally(() => setLoading(false));
  }, [tab, load]);

  const approve = async (row: AdminRefundRow) => {
    setBusyId(row.id);
    setErr(null);
    try {
      const out = await approveRefund(row.id);
      // A Razorpay refusal comes back as a 200 with `error` — the request is now FAILED
      // and retryable. Surfacing it as a banner (not a thrown error) keeps the admin on
      // the queue with the row visibly in "needs retry".
      if (out.error) setErr(`Razorpay refused this refund: ${out.error}. The request is retryable.`);
      await load(tab);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not approve that refund.');
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (row: AdminRefundRow) => {
    setBusyId(row.id);
    setErr(null);
    try {
      await rejectRefund(row.id, note.trim() || undefined);
      setRejectFor(null);
      setNote('');
      await load(tab);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not decline that request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Refunds</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Students can request a refund within {REFUND_WINDOW_DAYS} days of payment. Approving
            calls Razorpay; access is revoked when Razorpay confirms the money moved, so a
            request sits in <strong className="font-semibold text-navy">Approved</strong> until then.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load(tab)}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = t.key === 'ALL'
            ? REFUND_REQUEST_STATUSES.reduce((a, s) => a + (counts[s] ?? 0), 0)
            : (counts[t.key] ?? 0);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                tab === t.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {t.label}
              <span className={cn('ml-1.5', tab === t.key ? 'text-white/70' : 'text-slate-400')}>{n}</span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
          <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
          Nothing here.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-navy">
                      {r.student.fullName ?? r.student.email}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                        PILL[r.status] ?? 'bg-slate-50 text-slate-600 ring-slate-200',
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {r.student.email} · {money(r.amountCents)} ·{' '}
                    {r.order.scopeType ?? 'purchase'}
                    {r.order.scopeRef ? ` (${r.order.scopeRef})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    paid {when(r.order.paidAt)} · requested {when(r.requestedAt)}
                    {r.processedAt ? ` · refunded ${when(r.processedAt)}` : ''}
                  </p>
                  {r.reason ? (
                    <p className="mt-2 max-w-2xl rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      “{r.reason}”
                    </p>
                  ) : null}
                  {r.adminNote ? (
                    <p className="mt-2 text-xs text-slate-500">Note: {r.adminNote}</p>
                  ) : null}
                  {r.razorpayRefundId ? (
                    <p className="mt-1 font-mono text-xs text-slate-400">{r.razorpayRefundId}</p>
                  ) : null}
                </div>

                {r.status === REFUND_REQUEST_STATUS.REQUESTED ||
                r.status === REFUND_REQUEST_STATUS.FAILED ? (
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" onClick={() => void approve(r)} disabled={busyId === r.id}>
                      {busyId === r.id ? <Loader2 className="animate-spin" /> : <Check />}
                      {r.status === REFUND_REQUEST_STATUS.FAILED ? 'Retry refund' : 'Approve'}
                    </Button>
                    {r.status === REFUND_REQUEST_STATUS.REQUESTED ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRejectFor(r.id);
                          setNote('');
                        }}
                        disabled={busyId === r.id}
                      >
                        <X /> Decline
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {rejectFor === r.id ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Reason — shown to the student
                    </span>
                    <textarea
                      className="min-h-16 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={2000}
                      placeholder="They will read this, so give a real reason."
                    />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void decline(r)}
                      disabled={busyId === r.id}
                    >
                      Confirm decline
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setRejectFor(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
