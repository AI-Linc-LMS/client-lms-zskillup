'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, IndianRupee, Loader2, RefreshCw, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { StatusPill } from '@/components/student/StatusPill';
import { adminAutopayCharges, adminCancelAutopay, adminListAutopay } from '@/lib/api/autopay';
import { formatMoney } from '@/lib/api/subscriptions';
import {
  AUTOPAY_STATUS,
  autopayDate,
  cadence,
  CHARGE_STATUS,
  itemLabel,
  STOPPABLE,
} from '@/lib/payments/autopay-display';
import type {
  AdminAutopayListDto,
  AdminAutopayRowDto,
  AutopayChargeDto,
} from '@/shared/dto/autopay.dto';
import { AutopayStatus } from '@/shared/enums';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ key: AutopayStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: AutopayStatus.ACTIVE, label: 'Active' },
  { key: AutopayStatus.PENDING, label: 'Retrying' },
  { key: AutopayStatus.HALTED, label: 'Failed' },
  { key: AutopayStatus.CREATED, label: 'Awaiting approval' },
  { key: AutopayStatus.CANCELLED, label: 'Stopped' },
];

/**
 * Every Razorpay Autopay mandate, for Admin and Super Admin: who holds it, what it
 * renews, where it stands, and what it has actually collected — with every charge
 * attempt (paid, failed, refunded) one click away.
 *
 * "Failed" and "Retrying" are first-class filters because those are the mandates a
 * support team acts on: a student about to lose access over a card that expired.
 */
export function AutopayLedger() {
  const [status, setStatus] = useState<AutopayStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [data, setData] = useState<AdminAutopayListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<AdminAutopayRowDto | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminListAutopay({ status: status === 'ALL' ? undefined : status, q: applied })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load autopay.'));
  }, [status, applied]);
  useEffect(load, [load]);

  const s = data?.summary;
  const live =
    (s?.byStatus.ACTIVE ?? 0) + (s?.byStatus.AUTHENTICATED ?? 0) + (s?.byStatus.PENDING ?? 0);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile icon={Repeat} label="Live mandates" value={s ? live : '—'} hint="Active, approved or retrying" />
        <Tile
          icon={IndianRupee}
          label="Collected by autopay"
          value={s ? formatMoney(s.collectedCents) : '—'}
          hint="Net of refunds, all time"
        />
        <Tile icon={RefreshCw} label="Renewals, 30 days" value={s ? s.renewalsLast30d : '—'} hint="Successful charges" />
        <Tile
          icon={AlertTriangle}
          label="Failed charges, 30 days"
          value={s ? s.failedLast30d : '—'}
          hint={s && s.byStatus.HALTED > 0 ? `${s.byStatus.HALTED} mandate(s) gave up` : 'Razorpay retries these'}
          alert={!!s && s.failedLast30d > 0}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={status === f.key}
                onClick={() => setStatus(f.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  status === f.key ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {f.label}
                {s && f.key !== 'ALL' ? (
                  <span className="ml-1.5 tabular-nums opacity-70">{s.byStatus[f.key]}</span>
                ) : null}
              </button>
            ))}
          </div>
          <form
            className="relative w-full sm:w-64"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(query);
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <label htmlFor="autopay-search" className="sr-only">Search by student or item</label>
            <input
              id="autopay-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Student name, email or item"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            />
          </form>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        ) : !data ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Loading mandates…
          </p>
        ) : data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {applied || status !== 'ALL' ? 'No mandates match this filter.' : 'No student has set up autopay yet.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  <th className="pb-2 pr-3 font-semibold">Student</th>
                  <th className="pb-2 pr-3 font-semibold">Renews</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Paid / failed</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Collected</th>
                  <th className="pb-2 pr-3 font-semibold">Next charge</th>
                  <th className="pb-2 font-semibold" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => {
                  const st = AUTOPAY_STATUS[m.status];
                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="block font-semibold text-navy">{m.student.name ?? '—'}</span>
                        <span className="block text-xs text-slate-500">{m.student.email}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="block text-navy">{itemLabel(m.scope, m.scopeRef)}</span>
                        <span className="block text-xs text-slate-500">
                          {formatMoney(m.amountCents, m.currency)} {cadence(m.period)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusPill tone={m.cancelAtCycleEnd ? 'neutral' : st.tone} label={m.cancelAtCycleEnd ? 'Stopping' : st.label} />
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-navy">
                        {m.capturedCount}
                        <span className={cn('text-slate-400', m.failedCount > 0 && 'font-semibold text-red-600')}>
                          {' / '}
                          {m.failedCount}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums font-semibold text-navy">
                        {formatMoney(m.collectedCents, m.currency)}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500">
                        {STOPPABLE.has(m.status) && !m.cancelAtCycleEnd ? autopayDate(m.nextChargeAt) : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(m)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.truncated ? (
              <p className="pt-3 text-xs text-slate-500">
                Showing the newest {data.items.length}. Narrow with a filter or search to see older mandates.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <MandateDetail mandate={open} onClose={() => setOpen(null)} onStopped={load} />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  alert = false,
}: {
  icon: typeof Repeat;
  label: string;
  value: React.ReactNode;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className={cn(
          'grid size-11 place-items-center rounded-xl ring-1',
          alert ? 'bg-red-50 text-red-600 ring-red-100' : 'bg-orange/10 text-orange ring-orange/20',
        )}
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

/** One mandate: every charge attempt, and an audited stop. */
function MandateDetail({
  mandate,
  onClose,
  onStopped,
}: {
  mandate: AdminAutopayRowDto | null;
  onClose: () => void;
  onStopped: () => void;
}) {
  const [charges, setCharges] = useState<AutopayChargeDto[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCharges(null);
    if (!mandate) return;
    adminAutopayCharges(mandate.id)
      .then(setCharges)
      .catch(() => setCharges([]));
  }, [mandate]);

  if (!mandate) return null;
  const stoppable = STOPPABLE.has(mandate.status) && !mandate.cancelAtCycleEnd;

  const stop = async () => {
    setBusy(true);
    try {
      await adminCancelAutopay(mandate.id);
      toast.success('Autopay stopped. The student keeps the access already paid for.');
      setConfirming(false);
      onClose();
      onStopped();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not stop autopay.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={!confirming} onClose={onClose} maxWidth="max-w-2xl">
        <div className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Autopay mandate</p>
          <h2 className="mt-1 text-lg font-bold text-navy">{itemLabel(mandate.scope, mandate.scopeRef)}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {mandate.student.name ?? mandate.student.email} · {formatMoney(mandate.amountCents, mandate.currency)}{' '}
            {cadence(mandate.period)} · set up {autopayDate(mandate.createdAt)}
          </p>

          <h3 className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Charge attempts</h3>
          {!charges ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : charges.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No charge has run yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {charges.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums text-navy">
                      {formatMoney(c.amountCents, c.currency)}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {autopayDate(c.chargedAt)}
                        {c.method ? ` · ${c.method.toUpperCase()}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">{c.razorpayPaymentId}</p>
                    {c.failureReason ? <p className="text-xs text-red-600">{c.failureReason}</p> : null}
                  </div>
                  <StatusPill tone={CHARGE_STATUS[c.status].tone} label={CHARGE_STATUS[c.status].label} />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {stoppable ? (
              <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
                Stop autopay
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        eyebrow="Autopay"
        title="Stop this student’s autopay?"
        confirmLabel="Stop autopay"
        cancelLabel="Keep it on"
        tone="destructive"
        busy={busy}
        busyLabel="Stopping…"
        onConfirm={() => void stop()}
        onClose={() => (busy ? undefined : setConfirming(false))}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          No further charges for {mandate.student.email}. They keep the access already paid for. This action
          is recorded in the audit log.
        </p>
      </ConfirmDialog>
    </>
  );
}
