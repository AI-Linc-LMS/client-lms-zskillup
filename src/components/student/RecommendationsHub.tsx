'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Building2,
  ClipboardCheck,
  Loader2,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getCalibrationResults, type CalibrationResultsDto, type RecommendationDto } from '@/lib/api/recommendations';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { useUpgradeGate } from '@/hooks/useUpgradeGate';
import { UpgradeModal } from '@/components/billing/UpgradeModal';

/** Coarse grouping so products/companies/topics/sections read as distinct buckets. */
function groupOf(product: string): { key: string; order: number } {
  const p = product.toLowerCase();
  if (p.includes('company') || p.includes('pyq')) return { key: 'Company courses', order: 1 };
  if (p.includes('coding')) return { key: 'Coding', order: 4 };
  if (p.includes('section')) return { key: 'Section bundles', order: 2 };
  if (p.includes('topic')) return { key: 'Topics', order: 3 };
  if (p.includes('platform') || p.includes('foundation') || p.includes('renewal') || p.includes('subscription'))
    return { key: 'Full platform & bundles', order: 5 };
  if (p.includes('assessment')) return { key: 'Assessments & practice', order: 6 };
  return { key: 'More for you', order: 7 };
}

const bandTone = (band: string) =>
  band === 'High' ? 'emerald' : band === 'Medium' ? 'amber' : 'orange';

export function RecommendationsHub() {
  const [data, setData] = useState<CalibrationResultsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { mockTestId } = useCalibrationStatus();
  // Free students read every recommendation; acting on one prompts an upgrade. Inert while
  // PAYWALL_ENABLED is off — see useUpgradeGate.
  const upgrade = useUpgradeGate();

  useEffect(() => {
    getCalibrationResults()
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { order: number; items: RecommendationDto[] }>();
    for (const r of data.recommendations) {
      if (r.id === data.best?.id) continue; // shown in the "Best next step" hero
      const g = groupOf(r.product);
      if (!map.has(g.key)) map.set(g.key, { order: g.order, items: [] });
      map.get(g.key)!.items.push(r);
    }
    return [...map.entries()].sort((a, b) => a[1].order - b[1].order);
  }, [data]);

  if (loading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Transient fetch failure — don't mistake it for "not calibrated".
  if (failed || !data) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="font-display text-lg font-bold text-navy">Couldn&apos;t load your recommendations</h2>
        <p className="mt-1.5 text-sm text-slate-600">Something went wrong. Please refresh and try again.</p>
      </div>
    );
  }

  // Not calibrated yet — recommendations are driven by the calibration + practice.
  if (!data.calibrated) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717]">
          <ClipboardCheck className="size-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-navy">Unlock your recommendations</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Take your one-time placement readiness test - we&apos;ll map where you stand and recommend exactly the courses,
          companies, sections and topics to focus on next.
        </p>
        <Link
          href={mockTestId ? `/dashboard/quiz?mock=${mockTestId}` : '/dashboard'}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-2.5 text-sm font-extrabold text-[#171717] shadow-sm transition hover:brightness-105"
        >
          Take the placement readiness test <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const tone = bandTone(data.band);
  const top = data.topCompany;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-br from-[#ffc42d]/[0.08] to-transparent p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffc42d]/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#f5b400]">
              <Sparkles className="size-3.5" /> Recommended for you
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-navy">
              Your personalized next steps
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Based on your placement readiness and the practice you&apos;ve done - the courses, companies, sections and topics
              that move your readiness fastest.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div
              className={`font-display text-4xl font-black tabular-nums ${
                tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-[#f5b400]'
              }`}
            >
              {data.overall}%
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{data.bandLabel}</div>
          </div>
        </div>
        {data.aiSummary && <p className="px-6 py-5 text-[15px] font-medium leading-relaxed text-slate-700 sm:px-7">{data.aiSummary}</p>}
      </section>

      {/* Best next step */}
      {data.best && (
        <Link
          href={data.best.href}
          onClick={(e) => upgrade.guard(e, 'your best next step')}
          className="group block rounded-3xl border border-[#ffc42d]/40 bg-gradient-to-br from-[#ffc42d]/[0.12] to-transparent p-5 transition hover:border-[#f5b400]/50 sm:p-6"
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#f5b400]">
            <Award className="size-3.5" /> Best next step · {data.best.category}
          </span>
          <p className="mt-1.5 text-base font-semibold leading-relaxed text-navy">{data.best.message}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-5 py-2 text-sm font-extrabold text-[#171717] shadow-sm">
            {data.best.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Grouped product recommendations */}
      {groups.map(([label, g]) => (
        <section key={label} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
            <ShoppingBag className="size-4 text-[#f5b400]" /> {label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.items.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  onClick={(e) => upgrade.guard(e, r.category.toLowerCase())}
                  className="group flex h-full items-start gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-[#ffc42d]/40 hover:bg-[#ffc42d]/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{r.category}</span>
                    <span className="mt-1 block text-sm leading-snug text-slate-600">{r.message}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#f5b400]">
                      {r.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Company alignment */}
      {data.companies.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
            <Building2 className="size-4 text-navy" /> Companies you align with
          </h2>
          {top && (
            <p className="mb-4 text-sm text-slate-600">
              You align best with <span className="font-bold text-navy">{top.name}</span> - {top.readiness}% ready.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.companies.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/dashboard/company/${c.slug}`}
                  onClick={(e) => upgrade.guard(e, c.name)}
                  className="group block rounded-2xl border border-slate-100 p-4 transition hover:border-navy/30 hover:bg-slate-50/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-navy">{c.name}</span>
                    <span className="shrink-0 text-xs font-black tabular-nums text-[#f5b400]">{c.readiness}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400]" style={{ width: `${Math.max(3, c.readiness)}%` }} />
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-navy">
                    Prepare <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Focus areas */}
      {data.gaps.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600">
            <Target className="size-4 text-[#f5b400]" /> Focus areas to close first
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.gaps.map((s) => (
              <Link
                key={s.key}
                href="/practice"
                onClick={(e) => upgrade.guard(e, s.label)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-navy transition hover:border-[#ffc42d]/40 hover:bg-[#ffc42d]/[0.06]"
              >
                <TrendingUp className="size-3.5 text-[#f5b400]" /> {s.label}
                <span className="tabular-nums text-[#f5b400]">{s.score}%</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse everything */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 p-6 text-center sm:flex-row">
        <p className="text-sm text-slate-600">Want to explore everything available?</p>
        <div className="flex gap-2">
          <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
            <ShoppingBag className="size-4" /> Browse shop
          </Link>
          <Link href="/upgrade" className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy/90">
            <Sparkles className="size-4" /> Upgrade
          </Link>
        </div>
      </div>

      <UpgradeModal
        open={upgrade.feature !== null}
        onClose={upgrade.close}
        feature={upgrade.feature ?? undefined}
        message={
          upgrade.feature
            ? `Your recommendations are yours to read. Opening ${upgrade.feature} needs a plan.`
            : undefined
        }
      />
    </div>
  );
}
