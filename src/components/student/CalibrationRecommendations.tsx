'use client';

import Link from 'next/link';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { RecoAction, RecoScopeChip } from '@/components/recommendations/reco-cart';

/**
 * Dashboard "Recommended for you" — calibration-gated product picks. Before the
 * first calibration it shows an unlock teaser; after, a highlighted best pick +
 * a short ranked list, each with its reason (company / section / topic /
 * platform) and a one-click Add-to-cart (or a navigate CTA for nudges).
 */
export function CalibrationRecommendations() {
  const data = useRecommendations();
  const cal = useCalibrationStatus();

  if (!data) return null; // loading — avoid layout shift

  // ── Pre-calibration: unlock teaser ─────────────────────────────────────────
  if (!data.calibrated) {
    const href = cal.mockTestId ? `/dashboard/quiz?mock=${cal.mockTestId}` : '/dashboard';
    return (
      <div className="relative overflow-hidden rounded-3xl border border-orange/30 bg-gradient-to-br from-orange/[0.07] to-transparent p-5 shadow-sm sm:p-6">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-orange/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-sm">
            <Lock className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange">
              <Sparkles className="size-3.5" /> Recommended for you
            </span>
            <h2 className="mt-1.5 text-base font-black tracking-tight text-navy">
              Unlock your personalized recommendations
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Take the quick calibration assessment and we&apos;ll pick the exact company tracks,
              sections and topics to focus on next.
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/90"
          >
            Take calibration <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (data.items.length === 0) return null;
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
        <div className="rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/[0.07] to-transparent p-4">
          <RecoScopeChip r={best} />
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-navy">{best.message}</p>
          {best.reason ? <p className="mt-1 text-[11px] text-slate-400">Why: {best.reason}</p> : null}
          <div className="mt-3">
            <RecoAction r={best} />
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rest.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/60"
            >
              <span className="min-w-0 flex-1">
                <RecoScopeChip r={r} />
                <span className="mt-1 block text-sm leading-snug text-slate-600">{r.message}</span>
              </span>
              <RecoAction r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
