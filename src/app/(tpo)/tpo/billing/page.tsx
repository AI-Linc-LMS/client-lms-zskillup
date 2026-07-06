'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Loader2, Users } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getMe, type ApiMe } from '@/lib/api/me';
import { getPricing } from '@/lib/api/payments';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { formatPrice } from '@/lib/api/subscriptions';
import { buildPriceMap, PERIODS, priceKey } from '@/lib/payments/pricing';
import { usePurchase } from '@/components/billing/usePurchase';
import type { PriceBookEntryDto } from '@/shared/dto/payments.dto';
import { BillingPeriod, EntitlementScope, PriceTier } from '@/shared/enums';
import { cn } from '@/lib/utils';

/**
 * College B2B billing (TPO). Buy a recruiter company's question bank at the B2B
 * rate for the whole cohort — every student in the college inherits the access.
 */
export default function TpoBillingPage() {
  const [me, setMe] = useState<ApiMe | null>(null);
  const [pricing, setPricing] = useState<PriceBookEntryDto[]>([]);
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<BillingPeriod>(BillingPeriod.ANNUAL);
  const { buy, busyKey } = usePurchase();

  useEffect(() => {
    Promise.all([
      getMe().catch(() => null),
      getPricing().catch(() => [] as PriceBookEntryDto[]),
      listCompanies().catch(() => [] as ApiCompany[]),
    ]).then(([m, p, c]) => {
      setMe(m);
      setPricing(p);
      setCompanies(c);
      setLoading(false);
    });
  }, []);

  const priceMap = useMemo(() => buildPriceMap(pricing), [pricing]);
  const price = priceMap.get(priceKey(EntitlementScope.COMPANY, PriceTier.B2B, period));

  const buyCompany = (c: ApiCompany) =>
    buy({
      key: `college:${c.slug}:${period}`,
      scope: EntitlementScope.COMPANY,
      scopeRef: c.slug,
      period,
      label: `${c.name} — cohort access (${period.toLowerCase()})`,
      forCollege: true,
      prefill: { name: me?.fullName, email: me?.email },
    });

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/tpo/dashboard' }, { label: 'Billing' }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-navy">Cohort access</h1>
          <p className="max-w-xl text-sm text-slate-500">
            Buy a company&apos;s question bank at the B2B rate — every student in your college gets it, no per-seat setup.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {PERIODS.map(({ period: p, label }) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold transition-colors',
                period === p ? 'bg-navy text-white' : 'text-slate-500 hover:text-navy',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-orange/10 px-3 py-1 text-xs font-bold text-orange">
        <Users className="size-3.5" /> B2B rate {price ? `· ${formatPrice(price.amountCents, price.currency)} per company` : ''}
      </div>

      {companies.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No companies available yet.
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const key = `college:${c.slug}:${period}`;
            return (
              <div key={c.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt="" className="max-h-6 max-w-full object-contain" />
                    ) : (
                      <Building2 className="size-4 text-slate-400" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-navy">{c.name}</span>
                    <span className="text-xs text-slate-400">{price ? formatPrice(price.amountCents, price.currency) : '—'}</span>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busyKey === key || !price}
                  onClick={() => void buyCompany(c)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-3.5 py-2 text-xs font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(243,112,33,0.8)] disabled:opacity-60"
                >
                  {busyKey === key ? <Loader2 className="size-4 animate-spin" /> : <>Unlock <ArrowRight className="size-3.5" /></>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
