'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Code2,
  Crown,
  FileText,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { cartKey, useCart } from '@/components/billing/CartProvider';
import { FeatureItem, PlanPill, TrustBadges } from '@/components/billing/plan-ui';
import { useMySubscription } from '@/hooks/useMySubscription';
import { getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import {
  buildPriceMap,
  PERIODS,
  perMonthCents,
  periodMonths,
  periodSavingsPct,
  retailPrice,
} from '@/lib/payments/pricing';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';

const UNLIMITED = [
  'All Companies & Company Hubs',
  'All Sections',
  'All Topics & Sub-topics',
  'All Practice Tests & Mocks',
  'Performance Analytics',
  'All Upcoming Updates',
];

const FLOATERS = [BarChart3, FileText, Code2, Target];

/**
 * Full Platform Access — the all-access buying page (reached from Explore Plans →
 * "Get Full Access"). Pick 1 / 3 / 12 months; "Proceed to Checkout" adds the
 * PLATFORM line to the cart at the chosen period and jumps to the cart.
 */
export default function FullPlatformPage() {
  const cart = useCart();
  const router = useRouter();
  const { hasPlatform } = useMySubscription();
  const [prices, setPrices] = useState<PriceBookEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<BillingPeriod>(BillingPeriod.ANNUAL);

  useEffect(() => {
    getPricing()
      .catch(() => [])
      .then((pr) => {
        setPrices(pr);
        setLoading(false);
      });
  }, []);

  const priceMap = useMemo(() => buildPriceMap(prices), [prices]);
  const entryFor = (p: BillingPeriod) => retailPrice(priceMap, EntitlementScope.PLATFORM, p);
  const selected = entryFor(period);
  const platformItem = cart.items.find(
    (i) => i.scope === EntitlementScope.PLATFORM && i.scopeRef === null,
  );
  const inCart = !!platformItem;

  const savePct = periodSavingsPct(priceMap, EntitlementScope.PLATFORM, period);
  const monthly = entryFor(BillingPeriod.MONTHLY);
  const saveAmt =
    selected && monthly
      ? monthly.amountCents * (PERIODS.find((p) => p.period === period)?.multiple ?? 1) -
        selected.amountCents
      : 0;

  const proceed = () => {
    if (hasPlatform) {
      router.push('/upgrade');
      return;
    }
    if (!platformItem) {
      cart.add({ scope: EntitlementScope.PLATFORM, scopeRef: null, period, label: 'Full Platform Access' });
    } else if (platformItem.period !== period) {
      // Re-price the already-carted platform line to the newly chosen period.
      cart.setPeriod(cartKey(platformItem), period);
    }
    router.push('/cart');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to Explore Plans
      </Link>

      <header className="mt-4 flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#fff5ea] ring-1 ring-[#ffc42d]/25">
          <Crown className="size-7 text-[#a16207]" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">Full Platform Access</h1>
          <p className="text-sm text-slate-600">Get unlimited access to everything on prephasz</p>
        </div>
      </header>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="size-6 animate-spin text-[#f5b400]" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Everything. Unlimited. */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#fff5ea]/70 to-white p-6 shadow-sm">
              <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
                <div className="relative grid h-40 place-items-center rounded-2xl bg-gradient-to-br from-navy to-navy">
                  <InfinityIcon className="size-20 text-white/95" strokeWidth={2.5} />
                  {FLOATERS.map((Icon, i) => (
                    <span
                      key={i}
                      className="absolute grid size-9 place-items-center rounded-xl bg-white/95 text-[#a16207] shadow-md"
                      style={{
                        top: i < 2 ? '10%' : '72%',
                        left: i % 2 === 0 ? '8%' : '78%',
                      }}
                    >
                      <Icon className="size-4" />
                    </span>
                  ))}
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-navy">Everything. Unlimited.</h2>
                  <p className="mt-0.5 text-sm text-slate-600">One plan. All features. No limits.</p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {UNLIMITED.map((f) => (
                      <FeatureItem key={f} tone="violet">
                        {f}
                      </FeatureItem>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Choose Your Plan */}
            <section>
              <h2 className="mb-4 text-lg font-black tracking-tight text-navy">Choose Your Plan</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {PERIODS.map((p) => {
                  const entry = entryFor(p.period);
                  const active = period === p.period;
                  const pct = periodSavingsPct(priceMap, EntitlementScope.PLATFORM, p.period);
                  const perMo = perMonthCents(entry, p.period);
                  const popular = p.period === BillingPeriod.QUARTERLY;
                  return (
                    <button
                      key={p.period}
                      type="button"
                      onClick={() => setPeriod(p.period)}
                      className={`relative flex flex-col rounded-2xl border p-5 text-left transition ${
                        active
                          ? 'border-[#ffc42d] bg-[#fff5ea]/50 ring-2 ring-[#ffc42d]/40'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <PlanPill tone="violet">Most Popular</PlanPill>
                        </span>
                      )}
                      <span className="text-sm font-bold text-navy">{p.months}</span>
                      <span className="mt-2 text-2xl font-black tabular-nums text-navy">
                        {entry ? formatPrice(entry.amountCents, 'INR') : '-'}
                      </span>
                      {entry?.mrpCents != null && entry.mrpCents > entry.amountCents && (
                        <span className="text-sm font-medium tabular-nums text-slate-400 line-through">
                          {formatPrice(entry.mrpCents, 'INR')}
                        </span>
                      )}
                      {pct ? (
                        <span className="mt-1.5">
                          <PlanPill tone="emerald">Save {pct}%</PlanPill>
                        </span>
                      ) : (
                        <span className="mt-1.5 text-xs text-slate-500">Billed monthly</span>
                      )}
                      {perMo != null && p.period !== BillingPeriod.MONTHLY && (
                        <span className="mt-2 text-xs font-semibold text-slate-600">
                          Just {formatPrice(perMo, 'INR')}/month
                        </span>
                      )}
                      {/* spacer bottom-aligns the CTA across cards of unequal content */}
                      <span aria-hidden className="grow" />
                      <span
                        className={`mt-5 inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-bold transition ${
                          active ? 'bg-navy text-white' : 'border border-slate-200 text-navy'
                        }`}
                      >
                        {active ? 'Selected' : 'Select Plan'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Secure payments strip */}
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-navy">100% Secure Payments</p>
                  <p className="text-xs text-slate-600">Your payment information is safe with us.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {['Visa', 'Mastercard', 'UPI', 'RuPay', '& more'].map((m) => (
                  <span
                    key={m}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </section>

            <TrustBadges />
          </div>

          {/* Sticky sidebar - Your Plan */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#fff5ea] text-[#a16207]">
                  <Crown className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-navy">Full Platform Access</p>
                  <p className="text-xs text-slate-600">Unlimited access to all features</p>
                </div>
              </div>

              <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
                {['All Companies & Hubs', 'All Sections', 'All Topics & Sub-topics', 'All Practice Tests & Mocks', 'Performance Analytics', 'All Upcoming Updates'].map(
                  (f) => (
                    <FeatureItem key={f} tone="violet">
                      {f}
                    </FeatureItem>
                  ),
                )}
              </ul>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <span className="font-semibold text-slate-600">Plan</span>
                <span className="font-bold text-navy">{periodMonths(period)}</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm font-semibold text-slate-600">Total Amount</span>
                <span className="text-2xl font-black tabular-nums text-[#a16207]">
                  {selected ? formatPrice(selected.amountCents, 'INR') : '-'}
                </span>
              </div>
              {savePct && saveAmt > 0 && (
                <p className="mt-1 text-right text-xs font-bold text-emerald-600">
                  You save {formatPrice(saveAmt, 'INR')} ({savePct}%)
                </p>
              )}

              <button
                type="button"
                onClick={proceed}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange px-5 py-3 text-sm font-bold text-[#171717] shadow-sm transition hover:brightness-105"
              >
                {hasPlatform ? (
                  <>
                    <Crown className="size-4" /> Manage your plan
                  </>
                ) : inCart ? (
                  <>
                    <Check className="size-4" /> In cart - review &amp; pay
                  </>
                ) : (
                  <>
                    <Lock className="size-4" /> Proceed to Checkout
                  </>
                )}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                <Zap className="size-3.5 text-[#f5b400]" /> Instant access after payment
              </p>
            </div>

            {/* Changed your mind? */}
            <Link
              href="/shop/build"
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-[#ffc42d]/40 hover:bg-[#fff5ea]/40"
            >
              <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
                <Puzzle className="size-4 text-[#a16207]" /> Prefer a custom plan?
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[#a16207]">
                Build your own <Sparkles className="size-3.5" />
              </span>
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
