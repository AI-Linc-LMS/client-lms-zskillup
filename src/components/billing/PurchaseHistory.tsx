'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import {
  getMyPurchases,
  requestRefund,
  type MyPurchase,
} from '@/lib/api/refunds';
import {
  REFUND_INELIGIBLE_MESSAGE,
  REFUND_REQUEST_STATUS,
  REFUND_WINDOW_DAYS,
  formatRefundWindowLeft,
  type RefundIneligibleReason,
  type RefundRequestStatus,
} from '@/shared/refund-window';
import { Button } from '@/components/ui/button';
import { StatusPill, type StatusTone } from '@/components/student/StatusPill';

/**
 * The student's purchases, with the 3-day refund window on each.
 *
 * There was no purchases page at all before this, which is why it exists: a refund
 * window a buyer cannot see does nothing for conversion, which is the stated point of
 * the feature.
 *
 * Eligibility is NOT recomputed here. The server sends it, computed with the same shared
 * predicate, so the button and the API cannot disagree — a visible button that errors on
 * tap is worse than no button on a feature meant to make paying feel safe.
 */

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** How each refund state reads to the student who asked. */
function RefundState({ status, note }: { status: RefundRequestStatus; note: string | null }) {
  // Exhaustive Record, not a partial map: §10's lesson is that a status map missing a
  // key white-screens the page rather than degrading.
  const map: Record<RefundRequestStatus, { label: string; tone: StatusTone }> = {
    [REFUND_REQUEST_STATUS.REQUESTED]: { label: 'Refund requested', tone: 'info' },
    [REFUND_REQUEST_STATUS.APPROVED]: { label: 'Refund approved', tone: 'positive' },
    [REFUND_REQUEST_STATUS.PROCESSED]: { label: 'Refunded', tone: 'positive' },
    [REFUND_REQUEST_STATUS.REJECTED]: { label: 'Refund declined', tone: 'negative' },
    // "Processing" not "failed": the failure is ours to retry, and the student's request
    // is still live. "Failed" would read as a final no.
    [REFUND_REQUEST_STATUS.FAILED]: { label: 'Refund processing', tone: 'warning' },
  };
  const s = map[status] ?? { label: 'Refund requested', tone: 'neutral' as StatusTone };
  return (
    <div className="space-y-1.5">
      <StatusPill tone={s.tone} label={s.label} />
      {status === REFUND_REQUEST_STATUS.APPROVED ? (
        <p className="text-xs text-slate-500">
          Approved — banks usually settle this in 5–7 working days.
        </p>
      ) : null}
      {status === REFUND_REQUEST_STATUS.REJECTED && note ? (
        <p className="text-xs text-slate-600">{note}</p>
      ) : null}
    </div>
  );
}

export function PurchaseHistory() {
  const [rows, setRows] = useState<MyPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    getMyPurchases()
      .then(setRows)
      .catch(() => setErr('Could not load your purchases.'));

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  const submit = async (orderId: string) => {
    setBusy(true);
    setErr(null);
    try {
      await requestRefund(orderId, reason.trim() || undefined);
      setOpenFor(null);
      setReason('');
      await load();
    } catch (e) {
      // The server's sentence is the useful one — it names the actual reason (window
      // shut between load and tap, already requested, and so on).
      setErr(e instanceof Error ? e.message : 'Could not submit that refund request.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Account</p>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Purchases &amp; refunds</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Everything you have bought, and the status of any refund. You can request a refund
          within <strong className="font-semibold text-navy">{REFUND_WINDOW_DAYS} days</strong> of
          payment.
        </p>
      </div>

      {err && (
        <div
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          role="alert"
        >
          {err}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-base font-bold text-navy">No purchases yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            When you buy access it appears here, along with a {REFUND_WINDOW_DAYS}-day refund
            window.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((p) => {
            const left = formatRefundWindowLeft(p.eligibility.msRemaining);
            const reasonText = p.eligibility.reason
              ? REFUND_INELIGIBLE_MESSAGE[p.eligibility.reason as RefundIneligibleReason]
              : null;
            return (
              <li
                key={p.orderId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-navy">
                      {p.productLabel ?? 'Platform access'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {money(p.amountCents, p.currency)} · paid {date(p.paidAt ?? p.createdAt)}
                    </p>
                    {p.status === 'REFUNDED' ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-3.5" aria-hidden /> Refunded
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0 text-right">
                    {p.refund.status ? (
                      <RefundState status={p.refund.status} note={p.refund.adminNote} />
                    ) : p.eligibility.eligible ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpenFor(p.orderId);
                            setReason('');
                          }}
                        >
                          <RotateCcw /> Request refund
                        </Button>
                        {left ? (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <Clock className="size-3" aria-hidden /> {left}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      // Say WHY, rather than silently omitting the button — a missing
                      // control with no explanation reads as a bug.
                      <p className="max-w-[18rem] text-xs leading-relaxed text-slate-500">
                        <XCircle className="mr-1 inline size-3 align-[-2px] text-slate-400" aria-hidden />
                        {reasonText}
                      </p>
                    )}
                  </div>
                </div>

                {openFor === p.orderId ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Why are you asking for a refund? (optional)
                      </span>
                      <textarea
                        className="min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-navy focus:border-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={2000}
                        placeholder="This helps us improve. It is read by our team."
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      Your access to anything this purchase unlocked ends once the refund is
                      processed.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" onClick={() => void submit(p.orderId)} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : null} Submit request
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenFor(null)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
