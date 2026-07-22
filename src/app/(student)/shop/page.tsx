'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Crown, Puzzle, ShieldCheck, Sparkles } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  FaqAccordion,
  FeatureItem,
  IncludedGrid,
  PlanPill,
  SecurePaymentsNote,
  StatBand,
  TrustBadges,
  ValueProps,
} from '@/components/billing/plan-ui';
import {
  CUSTOM_FEATURES,
  PLAN_FAQ as FAQ,
  PLAN_INCLUDED as INCLUDED,
  PLAN_STATS as STATS,
  PLAN_VALUES as VALUES,
  PLATFORM_FEATURES,
} from '@/components/billing/plan-content';
import { useMySubscription } from '@/hooks/useMySubscription';
import { getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, retailPrice } from '@/lib/payments/pricing';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

/**
 * Explore Plans - the entry to the buying flow. Full-width marketing + the
 * "How would you like to prepare?" chooser: Full Platform Access (/shop/full)
 * or Build Your Own Plan (/shop/build).
 */
export default function ExplorePlansPage() {
  const { hasPlatform } = useMySubscription();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);

  useEffect(() => {
    getPricing()
      .then(setPrices)
      .catch(() => setPrices([]));
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const platformFrom = retailPrice(priceMap, EntitlementScope.PLATFORM, BillingPeriod.MONTHLY);
  const topicFrom = retailPrice(priceMap, EntitlementScope.TOPIC, BillingPeriod.MONTHLY);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Explore Plans' }]} />

      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-[#ffc42d]/30 bg-gradient-to-br from-[#fff5ea] via-white to-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-14">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-[#ffc42d]/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 size-64 rounded-full bg-[#ffc42d]/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffc42d]/40 bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#a16207]">
            <Sparkles className="size-3.5" /> Plans &amp; Access
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-navy sm:text-4xl">
            Everything you need to get placed
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Go all-access, or build a plan around exactly the companies and topics you&apos;re targeting.
            Practice, mocks, analytics and AI career tools - all in one place.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop/full"
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-navy/90"
            >
              <Crown className="size-4" /> Get Full Access
            </Link>
            <Link
              href="/shop/build"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-navy transition hover:bg-slate-50"
            >
              <Puzzle className="size-4 text-[#a16207]" /> Build Your Own
            </Link>
          </div>
        </div>
      </section>

      {hasPlatform && (
        <Link
          href="/upgrade"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#ffc42d]/40 bg-[#fff5ea]/70 px-4 py-3 text-sm font-semibold text-[#a16207] transition hover:bg-[#fff5ea]"
        >
          <span className="inline-flex items-center gap-2">
            <Crown className="size-4" /> You already have Full Platform access - manage it in Upgrade &amp; Renew.
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <StatBand stats={STATS} className="mt-4" />

      {/* Chooser */}
      <section className="mt-10">
        <div className="text-center">
          <h2 className="inline-block text-2xl font-black tracking-tight text-navy">How would you like to prepare?</h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-[#fff5ea]0" />
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">Pick the path that fits you - you can always add more later.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Full Platform Access */}
          <div
            data-tour="plans:full"
            className="relative flex flex-col overflow-hidden rounded-3xl border-2 border-[#ffc42d] bg-white p-6 shadow-md sm:p-8"
          >
            <span className="absolute right-6 top-6">
              <PlanPill tone="emerald">Best Value</PlanPill>
            </span>
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-navy to-navy text-white shadow-sm">
                <Crown className="size-7" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-navy">Full Platform Access</h3>
                <p className="text-sm text-slate-600">Unlimited access to everything</p>
              </div>
            </div>
            {platformFrom && (
              <p className="mt-5 text-sm text-slate-600">
                From{' '}
                <span className="text-2xl font-black tabular-nums text-navy">
                  {formatPrice(platformFrom.amountCents, 'INR')}
                </span>
                {platformFrom.mrpCents != null && platformFrom.mrpCents > platformFrom.amountCents && (
                  <span className="ml-1.5 text-base font-medium tabular-nums text-slate-400 line-through">
                    {formatPrice(platformFrom.mrpCents, 'INR')}
                  </span>
                )}
                <span className="text-slate-500">/month</span>
              </p>
            )}
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {PLATFORM_FEATURES.map((f) => (
                <FeatureItem key={f} tone="violet">
                  {f}
                </FeatureItem>
              ))}
            </ul>
            <Link
              href="/shop/full"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy/90"
            >
              <Crown className="size-4" /> Get Full Access
            </Link>
          </div>

          {/* Build Your Own Plan */}
          <div
            data-tour="plans:build"
            className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#fff5ea] text-[#a16207] ring-1 ring-[#ffc42d]/25">
                <Puzzle className="size-7" />
              </span>
              <div>
                <h3 className="text-xl font-black tracking-tight text-navy">Build Your Own Plan</h3>
                <p className="text-sm text-slate-600">Pay only for what you need</p>
              </div>
            </div>
            {topicFrom && (
              <p className="mt-5 text-sm text-slate-600">
                Topics from{' '}
                <span className="text-2xl font-black tabular-nums text-navy">
                  {formatPrice(topicFrom.amountCents, 'INR')}
                </span>
                {topicFrom.mrpCents != null && topicFrom.mrpCents > topicFrom.amountCents && (
                  <span className="ml-1.5 text-base font-medium tabular-nums text-slate-400 line-through">
                    {formatPrice(topicFrom.mrpCents, 'INR')}
                  </span>
                )}
                <span className="text-slate-500">/month</span>
              </p>
            )}
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {CUSTOM_FEATURES.map((f) => (
                <FeatureItem key={f} tone="slate">
                  {f}
                </FeatureItem>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Check className="size-3.5 text-emerald-500" /> Mix &amp; match - different validity per item
            </div>
            <Link
              href="/shop/build"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#ffc42d]/40 bg-white px-5 py-3.5 text-sm font-bold text-[#a16207] transition hover:bg-[#fff5ea]"
            >
              Start Customizing <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="mt-12">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-black tracking-tight text-navy">Everything you unlock</h2>
          <p className="mt-1 text-sm text-slate-600">Every plan is packed with the tools recruiters test on.</p>
        </div>
        <IncludedGrid items={INCLUDED} />
      </section>

      {/* Value props */}
      <section className="mt-12">
        <ValueProps items={VALUES} />
      </section>

      {/* FAQ */}
      <section className="mt-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-xl font-black tracking-tight text-navy">Frequently asked</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Everything you need to know before you pick a plan. Still unsure?{' '}
            <Link href="/support" className="font-semibold text-[#a16207] hover:underline">
              Talk to us
            </Link>
            .
          </p>
        </div>
        <FaqAccordion items={FAQ} />
      </section>

      <SecurePaymentsNote className="mt-12" />
      <TrustBadges className="mt-4" />

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck className="size-3.5 text-emerald-500" />
        Prices are shown before you pay - no charge until you review and confirm.
      </p>
    </div>
  );
}
