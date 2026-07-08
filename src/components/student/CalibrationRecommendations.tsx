'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getMyRecommendations, type RecommendationsResponseDto } from '@/lib/api/recommendations';

/**
 * CSV-driven recommendations for the calibrated student — a highlighted "best
 * next step" plus a short ranked list, each rendering the sheet's verbatim
 * message + CTA linking to the recommended product. Renders nothing until the
 * student has calibrated (or if no rule fired).
 */
export function CalibrationRecommendations() {
  const [data, setData] = useState<RecommendationsResponseDto | null>(null);

  useEffect(() => {
    let alive = true;
    getMyRecommendations()
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data || !data.calibrated || data.items.length === 0) return null;

  const best = data.best;
  const rest = data.items.filter((i) => i.id !== best?.id).slice(0, 3);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange">
            <Sparkles className="size-3.5" /> Recommended for you
          </span>
          <h2 className="mt-1.5 text-lg font-black tracking-tight text-navy">Your next steps</h2>
        </div>
        {data.overall != null && (
          <span className="shrink-0 text-right text-[11px] font-semibold text-slate-400">
            Calibration
            <span className="block text-base font-black tabular-nums text-navy">{data.overall}%</span>
          </span>
        )}
      </div>

      {best && (
        <Link
          href={best.href}
          className="group block rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/[0.07] to-transparent p-4 transition hover:border-orange/50"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange">{best.category}</span>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-navy">{best.message}</p>
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-4 py-1.5 text-xs font-extrabold text-white shadow-sm">
            {best.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {rest.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rest.map((r) => (
            <li key={r.id}>
              <Link
                href={r.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{r.category}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-600">{r.message}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-orange transition-colors group-hover:text-[#d9610f]">
                  {r.cta} <ArrowRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
