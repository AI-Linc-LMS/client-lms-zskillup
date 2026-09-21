'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { listMyAutopay } from '@/lib/api/autopay';
import { getPricing } from '@/lib/api/payments';
import { formatMoney } from '@/lib/api/subscriptions';
import { startAutopayMandate } from '@/lib/payments/razorpay-checkout';
import {
  autopayDate,
  cadence,
  PURCHASE_COMPLETE_EVENT,
  STOPPABLE,
  type PurchasedItem,
} from '@/lib/payments/autopay-display';
import { PriceTier } from '@/shared/enums';

/** One item the offer can renew, with the price the RENEWAL will charge. */
interface Offerable extends PurchasedItem {
  key: string;
  /** Full price-book price. NOT what was just paid — that may carry a coupon, and a
   *  coupon never applies to a renewal. */
  amountCents: number | null;
  currency: string;
  done: boolean;
  firstChargeAt: string | null;
}

const keyOf = (i: PurchasedItem) => `${i.scope}:${i.scopeRef ?? ''}:${i.period}`;

/**
 * "Turn on autopay?" — offered once, straight after any one-time purchase.
 *
 * Mounted once in the app shell and driven by the purchase event every checkout
 * path fires, so no buy button anywhere has to know autopay exists. It calls the
 * (student-only) autopay route ONLY after such an event, so it can never fire a
 * stray 403 from a TPO or admin page, and it stays invisible while the backend's
 * switch is off.
 *
 * Opt-in by design: a UPI or card mandate has to be approved by the student in
 * Razorpay, so it cannot be imposed — only offered at the moment it is most useful.
 */
export function AutopayOffer() {
  const [items, setItems] = useState<Offerable[]>([]);
  const [open, setOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const onPurchase = useCallback(async (bought: PurchasedItem[]) => {
    try {
      const [mine, pricing] = await Promise.all([listMyAutopay(), getPricing()]);
      if (!mine.enabled) return; // switch off — the offer does not exist
      const live = new Set(
        mine.items
          .filter((m) => STOPPABLE.has(m.status))
          .map((m) => `${m.scope}:${m.scopeRef ?? ''}:${m.period}`),
      );
      const offerable = bought
        .filter((b) => !live.has(keyOf(b)))
        .map((b) => {
          const price = pricing.find(
            (p) => p.scopeType === b.scope && p.period === b.period && p.tier === PriceTier.RETAIL && p.isActive,
          );
          return {
            ...b,
            key: keyOf(b),
            amountCents: price?.amountCents ?? null,
            currency: price?.currency ?? 'INR',
            done: false,
            firstChargeAt: null,
          };
        });
      if (offerable.length === 0) return;
      setItems(offerable);
      setOpen(true);
    } catch {
      // The purchase itself succeeded; failing to OFFER autopay must never surface as
      // an error on top of a successful payment.
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => void onPurchase((e as CustomEvent<PurchasedItem[]>).detail ?? []);
    window.addEventListener(PURCHASE_COMPLETE_EVENT, handler);
    return () => window.removeEventListener(PURCHASE_COMPLETE_EVENT, handler);
  }, [onPurchase]);

  const turnOn = async (item: Offerable) => {
    setBusyKey(item.key);
    try {
      const res = await startAutopayMandate({
        scope: item.scope,
        scopeRef: item.scopeRef,
        period: item.period,
        description: `Autopay · ${item.label}`,
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.key === item.key ? { ...i, done: true, firstChargeAt: res.firstChargeAt ?? null } : i)),
        );
        toast.success(
          res.firstChargeAt
            ? `Autopay is on — first renewal on ${autopayDate(res.firstChargeAt)}.`
            : 'Autopay is on.',
        );
      } else if (!res.dismissed) {
        toast.error(res.error ?? 'Could not turn on autopay.');
      }
    } finally {
      setBusyKey(null);
    }
  };

  const allDone = items.length > 0 && items.every((i) => i.done);

  return (
    <Modal open={open} onClose={() => setOpen(false)} maxWidth="max-w-md">
      <div className="p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-orange/10 text-orange ring-1 ring-orange/20">
          <RefreshCw className="size-5" />
        </span>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Never lose access
        </p>
        <h2 className="mt-1 text-lg font-bold text-navy">Turn on autopay for renewals?</h2>
        {/* Razorpay's own screen shows a small verification charge (₹5 on test cards;
            it varies by method), so "nothing is charged" would be contradicted a second
            later. Say what actually happens, without hardcoding an amount we do not set. */}
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We renew automatically one day before your access ends, so your preparation never
          pauses. Today your bank only takes a{' '}
          <span className="font-semibold text-navy">small verification amount, which is refunded</span>
          ; the plan price is charged only at renewal. Stop anytime from Upgrade &amp; Renew.
        </p>

        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.amountCents != null
                    ? `${formatMoney(item.amountCents, item.currency)} ${cadence(item.period)}`
                    : `Renews ${cadence(item.period)}`}
                </p>
                {item.done && item.firstChargeAt ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarClock className="size-3.5" aria-hidden />
                    First renewal {autopayDate(item.firstChargeAt)}
                  </p>
                ) : null}
              </div>
              {item.done ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" aria-hidden /> On
                </span>
              ) : (
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={busyKey !== null}
                  onClick={() => void turnOn(item)}
                >
                  {busyKey === item.key ? <Loader2 className="size-4 animate-spin" /> : null}
                  Turn on
                </Button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <Button variant={allDone ? 'default' : 'outline'} size="sm" onClick={() => setOpen(false)}>
            {allDone ? 'Done' : 'Not now'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
