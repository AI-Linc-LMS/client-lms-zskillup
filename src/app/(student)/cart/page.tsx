'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Check, Layers, Loader2, ShoppingCart, Sparkles, Target, Trash2 } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { useCart, cartKey, type CartItem } from '@/components/billing/CartProvider';
import { getPricing } from '@/lib/api/payments';
import { getMe } from '@/lib/api/me';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { formatPrice } from '@/lib/api/subscriptions';
import { startCartPurchase } from '@/lib/payments/razorpay-checkout';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

function scopeIcon(scope: EntitlementScope) {
  if (scope === EntitlementScope.PLATFORM) return Sparkles;
  if (scope === EntitlementScope.SECTION) return Layers;
  if (scope === EntitlementScope.COMPANY) return Building2;
  return Target;
}

export default function CartPage() {
  const { items, remove, clear, setPeriod, count } = useCart();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [prefill, setPrefill] = useState<{ name?: string | null; email?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void getPricing().then(setPrices).catch(() => setPrices([]));
    void getMe()
      .then((m) => setPrefill({ name: m.fullName, email: m.email }))
      .catch(() => {});
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const priceOf = (i: CartItem) => retailPrice(priceMap, i.scope, i.period)?.amountCents ?? null;
  const total = useMemo(
    () => items.reduce((sum, i) => sum + (priceOf(i) ?? 0), 0),
    [items, priceMap],
  );

  async function checkout() {
    if (items.length === 0) return;
    setBusy(true);
    setMsg(null);
    const res = await startCartPurchase(
      items.map((i) => ({ scope: i.scope, scopeRef: i.scopeRef ?? undefined, period: i.period })),
      prefill,
    );
    setBusy(false);
    if (res.ok) {
      clear();
      setDone(true);
      setMsg({
        kind: 'ok',
        text:
          res.skipped && res.skipped > 0
            ? `Unlocked! (${res.skipped} item${res.skipped === 1 ? '' : 's'} you already owned weren't charged.)`
            : 'Unlocked! Your new access is active.',
      });
    } else if (res.dismissed) {
      setMsg({ kind: 'err', text: 'Checkout cancelled — your cart is saved.' });
    } else {
      setMsg({ kind: 'err', text: res.error ?? 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Breadcrumb items={[{ label: 'Upgrade', href: '/upgrade' }, { label: 'Cart' }]} />
      <h1 className="mt-4 flex items-center gap-2 text-2xl font-black tracking-tight text-navy">
        <ShoppingCart className="size-6 text-orange" /> Your cart
      </h1>

      {done ? (
        <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Check className="size-6" />
          </div>
          <p className="mt-4 text-lg font-bold text-emerald-900">{msg?.text}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/practice" className="rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white">
              Start practising
            </Link>
            <Link href="/upgrade" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-navy">
              My subscription
            </Link>
          </div>
        </div>
      ) : count === 0 ? (
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
            <ShoppingCart className="size-6" />
          </div>
          <p className="mt-4 font-bold text-navy">Your cart is empty</p>
          <p className="mt-1 text-sm text-slate-500">Add topics, sections, or company hubs to unlock them together.</p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-xl bg-navy px-5 py-2.5 text-sm font-bold text-white"
          >
            Browse topics
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {items.map((i) => {
              const Icon = scopeIcon(i.scope);
              const amt = priceOf(i);
              const key = cartKey(i);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy">{i.label}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {i.scope.charAt(0) + i.scope.slice(1).toLowerCase()}
                    </p>
                  </div>
                  <select
                    value={i.period}
                    onChange={(e) => setPeriod(key, e.target.value as BillingPeriod)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-semibold text-navy"
                    aria-label="Billing period"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.period} value={p.period}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <span className="w-20 text-right font-bold tabular-nums text-navy">
                    {amt != null ? formatPrice(amt, 'INR') : '—'}
                  </span>
                  <button
                    onClick={() => remove(key)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${i.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Total ({count} item{count === 1 ? '' : 's'})
              </span>
              <span className="text-2xl font-black tabular-nums text-navy">{formatPrice(total, 'INR')}</span>
            </div>
            {msg && (
              <p className={`mt-3 text-sm font-semibold ${msg.kind === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
                {msg.text}
              </p>
            )}
            <button
              onClick={() => void checkout()}
              disabled={busy || total === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
              {busy ? 'Opening checkout…' : `Pay ${formatPrice(total, 'INR')}`}
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              Items you already own are removed automatically at checkout · Secured by Razorpay
            </p>
          </div>
        </>
      )}
    </div>
  );
}
