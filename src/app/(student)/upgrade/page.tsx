'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Code2,
  Layers,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { getMe, type ApiMe } from '@/lib/api/me';
import { getMySubscription, getPricing } from '@/lib/api/payments';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, PERIODS, retailPrice } from '@/lib/payments/pricing';
import { usePurchase } from '@/components/billing/usePurchase';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BillingPeriod, EntitlementScope } from '@/shared/enums';
import type { EntitlementDto, MySubscriptionDto, PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { cn } from '@/lib/utils';

/** Turn a slug ("profit-loss" / "coding:arrays-hashing") into a readable label. */
function prettyRef(ref: string | null): string {
  if (!ref) return '';
  return ref
    .replace(/^coding:/, '')
    .replace(/^section-\d+-/, '')
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function scopeIcon(scope: EntitlementScope) {
  switch (scope) {
    case EntitlementScope.PLATFORM:
      return Sparkles;
    case EntitlementScope.SECTION:
      return Layers;
    case EntitlementScope.COMPANY:
      return Building2;
    default:
      return Target;
  }
}

export default function UpgradePage() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [sub, setSub] = useState<MySubscriptionDto | null>(null);
  const [pricing, setPricing] = useState<PriceBookEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { buy, busyKey } = usePurchase();

  const load = async () => {
    const [m, s, p] = await Promise.all([
      getMe().catch(() => null),
      getMySubscription().catch(() => null),
      getPricing().catch(() => [] as PriceBookEntryDto[]),
    ]);
    setMe(m);
    setSub(s);
    setPricing(p);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const priceMap = useMemo(() => buildPriceMap(pricing), [pricing]);
  const hasPlatform = sub?.hasPlatform ?? false;
  const platformEnt = sub?.entitlements.find(
    (e) => e.scopeType === EntitlementScope.PLATFORM && e.status === 'ACTIVE',
  );
  const activeUnlocks = (sub?.entitlements ?? []).filter(
    (e) => e.status === 'ACTIVE' && e.scopeType !== EntitlementScope.PLATFORM,
  );

  const refresh = () => void getMySubscription().then(setSub).catch(() => {});

  const buyPlatform = (period: BillingPeriod) =>
    buy({
      key: `platform:${period}`,
      scope: EntitlementScope.PLATFORM,
      period,
      label: `Full platform (${period.toLowerCase()})`,
      prefill: { name: me?.fullName, email: me?.email },
      onPurchased: refresh,
    });

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Upgrade' }]} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.85)] sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[42vw] rounded-full bg-[#f37021]/25 blur-[120px]" />
          <div className="absolute -right-1/4 -bottom-1/2 size-[38vw] rounded-full bg-[#2563eb]/20 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#f37021]/40 bg-[#f37021]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#ffb787]">
            <Sparkles className="size-3.5" /> {hasPlatform ? 'Full access active' : 'Upgrade'}
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            {hasPlatform ? "You're all unlocked." : 'Unlock the whole question bank.'}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {hasPlatform
              ? `Full platform access is active${
                  platformEnt?.daysRemaining != null ? ` — ${platformEnt.daysRemaining} days left` : ''
                }. Every topic, section and company hub is open.`
              : 'Get every topic, every section and every company hub — or unlock just what you need, one topic at a time. You always get the first 5 questions of anything free.'}
          </p>
        </div>
      </section>

      {/* ── Your access ──────────────────────────────────────────────────── */}
      {(hasPlatform || activeUnlocks.length > 0) && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <BadgeCheck className="size-4 text-emerald-500" /> Your access
          </h2>
          {hasPlatform ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-navy">Full platform</p>
                <p className="text-xs text-slate-500">
                  {platformEnt?.daysRemaining != null
                    ? `${platformEnt.daysRemaining} days remaining`
                    : 'Active'}
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {activeUnlocks.map((e) => (
                <AccessRow key={e.id} ent={e} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Full platform plans ──────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-navy sm:text-xl">Full platform</h2>
            <p className="text-sm text-slate-500">Everything unlocked while your plan is active.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PERIODS.map(({ period, label }, i) => {
            const price = retailPrice(priceMap, EntitlementScope.PLATFORM, period);
            const best = period === BillingPeriod.ANNUAL;
            const key = `platform:${period}`;
            return (
              <div
                key={period}
                className={cn(
                  'relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
                  best ? 'border-orange ring-1 ring-orange/30' : 'border-slate-200',
                )}
              >
                {best && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow">
                    Best value
                  </span>
                )}
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-navy">
                  {price ? formatPrice(price.amountCents, price.currency) : '—'}
                  <span className="text-sm font-semibold text-slate-400">
                    {' '}
                    /{period === BillingPeriod.MONTHLY ? 'mo' : period === BillingPeriod.QUARTERLY ? 'qtr' : 'yr'}
                  </span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {['All 4 aptitude sections', 'All coding topics', 'Every company hub + PYQs', 'Unlimited questions'].map(
                    (f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-emerald-500" /> {f}
                      </li>
                    ),
                  )}
                </ul>
                <button
                  type="button"
                  disabled={hasPlatform || busyKey === key || !price}
                  onClick={() => void buyPlatform(period)}
                  className={cn(
                    'mt-5 flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold transition-opacity disabled:opacity-60',
                    best
                      ? 'bg-gradient-to-r from-[#f7a14e] to-[#f37021] text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)]'
                      : 'bg-navy text-white',
                  )}
                >
                  {hasPlatform ? (
                    'Active'
                  ) : busyKey === key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Get {label} <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Buy just what you need ───────────────────────────────────────── */}
      {!hasPlatform && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-navy">Or buy just what you need</h2>
          <p className="text-sm text-slate-500">
            You get the first 5 questions of any topic free. Unlock more from the topic or company page.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <MiniPlan
              icon={Target}
              title="Single topic"
              subtitle="One topic, e.g. Profit & Loss"
              price={retailPrice(priceMap, EntitlementScope.TOPIC, BillingPeriod.MONTHLY)}
              annual={retailPrice(priceMap, EntitlementScope.TOPIC, BillingPeriod.ANNUAL)}
              href="/practice"
              cta="Browse topics"
            />
            <MiniPlan
              icon={Layers}
              title="Whole section"
              subtitle="All topics in a section"
              price={retailPrice(priceMap, EntitlementScope.SECTION, BillingPeriod.MONTHLY)}
              annual={retailPrice(priceMap, EntitlementScope.SECTION, BillingPeriod.ANNUAL)}
              href="/practice"
              cta="Browse sections"
            />
            <MiniPlan
              icon={Building2}
              title="Company hub"
              subtitle="One recruiter's PYQ bank"
              price={retailPrice(priceMap, EntitlementScope.COMPANY, BillingPeriod.MONTHLY)}
              annual={retailPrice(priceMap, EntitlementScope.COMPANY, BillingPeriod.ANNUAL)}
              href="/dashboard/company"
              cta="Browse companies"
            />
          </div>
        </section>
      )}

      {/* ── Purchase history ─────────────────────────────────────────────── */}
      {sub && sub.history.length > 0 && (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Clock className="size-4 text-slate-400" /> Purchase history
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 text-right">Status</th>
                  <th className="pb-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sub.history.map((h) => (
                  <tr key={h.orderId}>
                    <td className="py-2.5 font-semibold text-navy">
                      {h.items && h.items.length > 0
                        ? `Cart · ${h.items.length} item${h.items.length === 1 ? '' : 's'}`
                        : h.scopeType === EntitlementScope.PLATFORM
                          ? 'Full platform'
                          : prettyRef(h.scopeRef) || h.scopeType}
                    </td>
                    <td className="py-2.5 capitalize text-slate-500">{h.period ? h.period.toLowerCase() : '—'}</td>
                    <td className="py-2.5 text-right tabular-nums text-navy">{formatPrice(h.amountCents, h.currency)}</td>
                    <td className="py-2.5 text-right">
                      <StatusPill status={h.status} />
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">
                      {new Date(h.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Code2 className="size-3.5" /> Secured by Razorpay · GST invoices on request
      </p>
    </div>
  );
}

function AccessRow({ ent }: { ent: EntitlementDto }) {
  const Icon = scopeIcon(ent.scopeType);
  const label =
    ent.scopeType === EntitlementScope.PLATFORM
      ? 'Full platform'
      : `${ent.scopeType.charAt(0) + ent.scopeType.slice(1).toLowerCase()}: ${slugToLabel(ent.scopeRef)}`;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-orange ring-1 ring-slate-200">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-navy">{label}</span>
        <span className="text-xs text-slate-500">
          {ent.daysRemaining != null ? `${ent.daysRemaining} days left` : 'Lifetime'}
        </span>
      </span>
    </li>
  );
}

function slugToLabel(ref: string | null): string {
  if (!ref) return '';
  return ref
    .replace(/^coding:/, '')
    .replace(/^section-\d+-/, '')
    .split(/[-:]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function MiniPlan({
  icon: Icon,
  title,
  subtitle,
  price,
  annual,
  href,
  cta,
}: {
  icon: typeof Target;
  title: string;
  subtitle: string;
  price?: PriceBookEntryDto;
  annual?: PriceBookEntryDto;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 p-5">
      <span className="grid size-9 place-items-center rounded-xl bg-orange/10 text-orange">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm font-extrabold text-navy">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <p className="mt-3 text-xl font-black text-navy">
        {price ? formatPrice(price.amountCents, price.currency) : '—'}
        <span className="text-xs font-semibold text-slate-400"> /mo</span>
      </p>
      {annual && (
        <p className="text-[11px] text-slate-400">or {formatPrice(annual.amountCents, annual.currency)} /yr</p>
      )}
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-orange hover:underline"
      >
        {cta} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700',
    CREATED: 'bg-amber-50 text-amber-700',
    FAILED: 'bg-rose-50 text-rose-700',
    REFUNDED: 'bg-slate-100 text-slate-600',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', map[status] ?? 'bg-slate-100 text-slate-600')}>
      {status === 'CREATED' ? 'Pending' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
