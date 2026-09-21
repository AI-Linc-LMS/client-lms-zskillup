'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusPill } from '@/components/student/StatusPill';
import { cancelMyAutopay, listMyAutopay } from '@/lib/api/autopay';
import { formatMoney } from '@/lib/api/subscriptions';
import { startAutopayMandate } from '@/lib/payments/razorpay-checkout';
import {
  AUTOPAY_STATUS,
  autopayDate,
  cadence,
  itemLabel,
  STOPPABLE,
} from '@/lib/payments/autopay-display';
import type { AutopayDto, AutopayListDto } from '@/shared/dto/autopay.dto';
import type {
  EntitlementDto,
  PriceBookEntryDto,
  PurchaseHistoryItemDto,
} from '@/shared/dto/payments.dto';
import { BillingPeriod, EntitlementSubject, PriceTier } from '@/shared/enums';

/** An item the student holds and could put on autopay. */
interface Renewable {
  key: string;
  ent: EntitlementDto;
  period: BillingPeriod;
  price: PriceBookEntryDto | undefined;
}

const scopeKey = (scope: string, ref: string | null) => `${scope}:${ref ?? ''}`;

/**
 * AUTOPAY on Upgrade & Renew: the student's mandates, and a way to put anything
 * they hold on autopay.
 *
 * Invisible while the backend switch is off AND the student has no mandate. A
 * student who already has one always sees it — and can always stop it — whatever
 * the switch says: nobody is ever left unable to find or cancel a recurring charge.
 *
 * Only the student's OWN dated purchases are offered. College-granted or lifetime
 * access has nothing to renew, and the server would refuse it anyway.
 */
export function AutopayPanel({
  entitlements,
  history,
  pricing,
  onChanged,
}: {
  entitlements: EntitlementDto[];
  history: PurchaseHistoryItemDto[];
  pricing: PriceBookEntryDto[];
  onChanged: () => void;
}) {
  const [data, setData] = useState<AutopayListDto | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [stopping, setStopping] = useState<AutopayDto | null>(null);
  const [stopBusy, setStopBusy] = useState(false);

  const load = useCallback(() => {
    listMyAutopay()
      .then(setData)
      .catch(() => setData({ enabled: false, items: [] }));
  }, []);
  useEffect(load, [load]);

  const mandates = data?.items ?? [];
  const liveKeys = useMemo(
    () => new Set(mandates.filter((m) => STOPPABLE.has(m.status)).map((m) => scopeKey(m.scope, m.scopeRef))),
    [mandates],
  );

  const renewables: Renewable[] = useMemo(() => {
    if (!data?.enabled) return [];
    return entitlements
      .filter(
        (e) =>
          e.status === 'ACTIVE' &&
          e.subjectType === EntitlementSubject.USER &&
          e.source === 'PURCHASE' &&
          e.expiresAt !== null &&
          !liveKeys.has(scopeKey(e.scopeType, e.scopeRef)),
      )
      .map((e) => {
        // Renew at the cadence they last bought it at; monthly if we cannot tell.
        const period =
          history.find((h) => h.status === 'PAID' && h.scopeType === e.scopeType && h.scopeRef === e.scopeRef && h.period)
            ?.period ?? BillingPeriod.MONTHLY;
        const price = pricing.find(
          (p) => p.scopeType === e.scopeType && p.period === period && p.tier === PriceTier.RETAIL && p.isActive,
        );
        return { key: scopeKey(e.scopeType, e.scopeRef), ent: e, period, price };
      });
  }, [data?.enabled, entitlements, history, pricing, liveKeys]);

  if (!data) return null;
  if (mandates.length === 0 && renewables.length === 0) return null;

  const turnOn = async (r: Renewable) => {
    setBusyKey(r.key);
    try {
      const res = await startAutopayMandate({
        scope: r.ent.scopeType,
        scopeRef: r.ent.scopeRef,
        period: r.period,
        description: `Autopay · ${itemLabel(r.ent.scopeType, r.ent.scopeRef)}`,
      });
      if (res.ok) {
        toast.success(
          res.firstChargeAt ? `Autopay is on — first renewal on ${autopayDate(res.firstChargeAt)}.` : 'Autopay is on.',
        );
        load();
        onChanged();
      } else if (!res.dismissed) {
        toast.error(res.error ?? 'Could not turn on autopay.');
      }
    } finally {
      setBusyKey(null);
    }
  };

  const confirmStop = async () => {
    if (!stopping) return;
    setStopBusy(true);
    try {
      const out = await cancelMyAutopay(stopping.id);
      toast.success(
        out.currentEnd
          ? `Autopay stopped. You keep access until ${autopayDate(out.currentEnd)}.`
          : 'Autopay stopped.',
      );
      setStopping(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not stop autopay.');
    } finally {
      setStopBusy(false);
    }
  };

  return (
    <section id="autopay" className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
          <RefreshCw className="size-5" />
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Autopay</p>
          <h2 className="text-base font-bold text-navy">Renew automatically, never lose access</h2>
          <p className="mt-1 text-sm text-slate-500">
            Charged one day before access ends, at the plan price. Stop anytime — you keep what
            you have paid for.
          </p>
        </div>
      </div>

      {mandates.length > 0 ? (
        <ul className="mt-5 divide-y divide-slate-100">
          {mandates.map((m) => {
            const st = AUTOPAY_STATUS[m.status];
            const stoppable = STOPPABLE.has(m.status) && !m.cancelAtCycleEnd;
            return (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{itemLabel(m.scope, m.scopeRef)}</p>
                    <StatusPill tone={m.cancelAtCycleEnd ? 'neutral' : st.tone} label={m.cancelAtCycleEnd ? 'Stopping' : st.label} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatMoney(m.amountCents, m.currency)} {cadence(m.period)}
                  </p>
                  {stoppable && m.nextChargeAt ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <CalendarClock className="size-3.5" aria-hidden />
                      Next renewal {autopayDate(m.nextChargeAt)}
                    </p>
                  ) : null}
                  {m.cancelAtCycleEnd && m.currentEnd ? (
                    <p className="mt-1 text-xs text-slate-500">
                      No further charges. Access continues until {autopayDate(m.currentEnd)}.
                    </p>
                  ) : null}
                </div>
                {stoppable ? (
                  <Button variant="ghost" size="sm" onClick={() => setStopping(m)}>
                    Stop autopay
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {renewables.length > 0 ? (
        <ul className={`${mandates.length > 0 ? 'mt-2 border-t border-slate-100 pt-2' : 'mt-5'} divide-y divide-slate-100`}>
          {renewables.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy">{itemLabel(r.ent.scopeType, r.ent.scopeRef)}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Access until {autopayDate(r.ent.expiresAt)}
                  {r.price ? ` · then ${formatMoney(r.price.amountCents, r.price.currency)} ${cadence(r.period)}` : ''}
                </p>
              </div>
              <Button size="sm" disabled={busyKey !== null} onClick={() => void turnOn(r)}>
                {busyKey === r.key ? <Loader2 className="size-4 animate-spin" /> : null}
                Turn on autopay
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={stopping !== null}
        eyebrow="Autopay"
        title="Stop autopay?"
        confirmLabel="Stop autopay"
        cancelLabel="Keep it on"
        tone="destructive"
        busy={stopBusy}
        busyLabel="Stopping…"
        onConfirm={() => void confirmStop()}
        onClose={() => (stopBusy ? undefined : setStopping(null))}
      >
        {stopping ? (
          <p className="text-sm leading-relaxed text-slate-600">
            No more automatic charges for{' '}
            <span className="font-semibold text-navy">{itemLabel(stopping.scope, stopping.scopeRef)}</span>. You keep the
            access you have already paid for, and can renew by hand whenever you like.
          </p>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
