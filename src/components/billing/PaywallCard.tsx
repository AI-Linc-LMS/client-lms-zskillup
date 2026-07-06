'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Lock, Sparkles } from 'lucide-react';
import { getPricing } from '@/lib/api/payments';
import { getMe } from '@/lib/api/me';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { usePurchase } from './usePurchase';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import type { AdaptivePaywall } from '@/lib/api/adaptive';
import { cn } from '@/lib/utils';

function prettyRef(ref: string | null): string {
  if (!ref) return 'this content';
  return ref
    .replace(/^coding:/, '')
    .replace(/^section-\d+-/, '')
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function scopeNoun(scope: string): string {
  switch (scope) {
    case EntitlementScope.SECTION:
      return 'section';
    case EntitlementScope.COMPANY:
      return 'company';
    case EntitlementScope.TOPIC:
      return 'topic';
    default:
      return 'content';
  }
}

/**
 * The in-place paywall (Phase 2). Shown when a student hits their free-question
 * limit in an unowned scope. Offers the exact scope at its three periods plus a
 * full-platform upsell; buying any of them calls onUnlocked() to continue.
 */
export function PaywallCard({
  paywall,
  onUnlocked,
}: {
  paywall: AdaptivePaywall;
  onUnlocked: () => void;
}) {
  const [pricing, setPricing] = useState<PriceBookEntryDto[]>([]);
  const [prefill, setPrefill] = useState<{ name?: string | null; email?: string | null }>({});
  const { buy, busyKey } = usePurchase();

  useEffect(() => {
    getPricing().then(setPricing).catch(() => {});
    getMe()
      .then((m) => setPrefill({ name: m.fullName, email: m.email }))
      .catch(() => {});
  }, []);

  const priceMap = useMemo(() => buildPriceMap(pricing), [pricing]);
  const scope = paywall.scope as EntitlementScope;
  const name = prettyRef(paywall.scopeRef);
  const noun = scopeNoun(paywall.scope);

  const purchase = (
    targetScope: EntitlementScope,
    ref: string | null,
    period: BillingPeriod,
    label: string,
  ) =>
    void buy({
      key: `${targetScope}:${ref ?? ''}:${period}`,
      scope: targetScope,
      scopeRef: ref,
      period,
      label,
      prefill,
      onPurchased: (res) => {
        if (res.ok) onUnlocked();
      },
    });

  const platformAnnual = retailPrice(priceMap, EntitlementScope.PLATFORM, BillingPeriod.ANNUAL);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-[0_24px_60px_-30px_rgba(11,18,32,0.4)] sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_12px_28px_-12px_rgba(243,112,33,0.9)]">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 text-xl font-black tracking-tight text-navy sm:text-2xl">
        You&apos;ve used your {paywall.freeLimit} free questions
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">
        Unlock <span className="font-semibold text-navy">{name}</span> to keep practising — every
        question, hint and prediction in this {noun}.
      </p>

      {/* Scope period options */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
        {PERIODS.map(({ period, label, short }) => {
          const price = retailPrice(priceMap, scope, period);
          const key = `${scope}:${paywall.scopeRef ?? ''}:${period}`;
          const best = period === BillingPeriod.ANNUAL;
          return (
            <button
              key={period}
              type="button"
              disabled={busyKey !== null || !price}
              onClick={() => purchase(scope, paywall.scopeRef, period, `${name} (${label.toLowerCase()})`)}
              className={cn(
                'flex flex-col items-center rounded-2xl border p-3 transition-colors disabled:opacity-60',
                best ? 'border-orange bg-orange/5' : 'border-slate-200 hover:border-orange/50',
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
              <span className="mt-0.5 text-lg font-black text-navy">
                {busyKey === key ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : price ? (
                  <>
                    {formatPrice(price.amountCents, price.currency)}
                    <span className="text-[11px] font-semibold text-slate-400">{short}</span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Platform upsell */}
      <div className="mt-5 flex items-center gap-2">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">or unlock everything</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <button
        type="button"
        disabled={busyKey !== null || !platformAnnual}
        onClick={() =>
          purchase(EntitlementScope.PLATFORM, null, BillingPeriod.ANNUAL, 'Full platform (annual)')
        }
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
      >
        <Sparkles className="size-4 text-[#ffb787]" />
        Full platform{platformAnnual ? ` — ${formatPrice(platformAnnual.amountCents, platformAnnual.currency)}/yr` : ''}
      </button>
      <Link
        href="/upgrade"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-orange"
      >
        See all plans <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
