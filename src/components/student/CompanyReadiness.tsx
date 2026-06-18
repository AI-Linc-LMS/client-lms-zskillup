'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Loader2, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCompanyReadiness, type CompanyReadiness } from '@/lib/api/adaptive';

const BAND_COLOR = {
  emerging: { bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-400', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  developing: { bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
  proficient: { bg: 'bg-blue-50', border: 'border-blue-200', bar: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  mastered: { bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
} as const;

const READY_THRESHOLD = 65; // >= this % = "ready"

/**
 * Shows per-company readiness scores on the student dashboard,
 * derived from their latest completed adaptive mock session.
 */
export function CompanyReadiness() {
  const [data, setData] = useState<CompanyReadiness[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanyReadiness()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-white p-5 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin text-orange" />
        Checking company readiness…
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">Company Readiness</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Take an adaptive mock test to see which companies you&apos;re ready for.
            </p>
            <Link
              href="/mock-tests"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline"
            >
              Take adaptive test <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ready = data.filter((c) => c.readinessPct >= READY_THRESHOLD);
  const notReady = data.filter((c) => c.readinessPct < READY_THRESHOLD);
  const topCompany = data[0];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-orange" />
          <span className="font-bold text-navy text-sm">Company Readiness</span>
        </div>
        {ready.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Trophy className="size-3" />
            {ready.length} ready
          </span>
        )}
      </div>

      {/* Top company highlight */}
      {topCompany && (
        <div
          className={cn(
            'rounded-xl border p-4',
            BAND_COLOR[topCompany.readinessBand].bg,
            BAND_COLOR[topCompany.readinessBand].border,
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-navy">{topCompany.companyName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{topCompany.companyType}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-2xl font-extrabold', BAND_COLOR[topCompany.readinessBand].text)}>
                {topCompany.readinessPct}%
              </p>
              <span
                className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  BAND_COLOR[topCompany.readinessBand].badge,
                )}
              >
                {topCompany.readinessBand}
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/60">
            <div
              className={cn('h-full rounded-full transition-all duration-700', BAND_COLOR[topCompany.readinessBand].bar)}
              style={{ width: `${topCompany.readinessPct}%` }}
            />
          </div>
          {topCompany.readinessPct >= READY_THRESHOLD && (
            <p className="mt-2 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
              <Sparkles className="size-3" /> You&apos;re ready to apply!
            </p>
          )}
        </div>
      )}

      {/* Other companies */}
      {data.length > 1 && (
        <div className="space-y-2">
          {data.slice(1).map((c) => {
            const cfg = BAND_COLOR[c.readinessBand];
            return (
              <div key={c.companyId} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-medium text-navy truncate">{c.companyName}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full', cfg.bar)}
                    style={{ width: `${c.readinessPct}%` }}
                  />
                </div>
                <span className={cn('text-xs font-bold w-10 text-right', cfg.text)}>
                  {c.readinessPct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Improve CTA */}
      {notReady.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-[11px] text-slate-500 mb-2">
            Practice weak skills to improve readiness for {notReady.map((c) => c.companyName).join(', ')}.
          </p>
          <Link
            href="/mock-tests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline"
          >
            Retake adaptive test <ArrowRight className="size-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
