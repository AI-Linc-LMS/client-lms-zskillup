'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, Loader2, Lock, ShoppingCart, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { RecoAction, RecoScopeChip } from '@/components/recommendations/reco-cart';

/**
 * Top-bar "Recommended for you" dropdown. Calibration-gated: before the first
 * calibration assessment it shows an unlock teaser; after it, personalized
 * product picks (company / section / topic / platform) each with the reason and
 * a one-click Add-to-cart. Mirrors the ExploreMenu open/close model.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function RecommendedMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const data = useRecommendations();
  const cal = useCalibrationStatus();

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 150);
  }, [cancelClose]);
  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);
  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeNow();
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeNow();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open, closeNow]);
  useEffect(() => () => cancelClose(), [cancelClose]);

  const calibrated = !!data?.calibrated;
  const best = data?.best ?? null;
  const rest = (data?.items ?? []).filter((i) => i.id !== best?.id).slice(0, 4);
  // A small "new picks" dot when there are add-to-cart-able recommendations.
  const hasPicks = calibrated && (data?.items ?? []).some((i) => i.addable);
  const calMockHref = cal.mockTestId ? `/dashboard/quiz?mock=${cal.mockTestId}` : '/dashboard';

  return (
    <div ref={rootRef} className="relative hidden lg:block" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? closeNow() : openNow())}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all',
          open ? 'bg-orange/10 text-navy ring-1 ring-orange/20' : 'text-slate-600 hover:bg-slate-100 hover:text-navy',
        )}
      >
        <span className="relative">
          <Wand2 className={cn('size-4 transition-colors', open ? 'text-orange' : 'text-slate-500 group-hover:text-orange')} aria-hidden />
          {hasPicks && !open ? (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-orange ring-2 ring-white" />
          ) : null}
        </span>
        Recommended for you
        <ChevronDown className={cn('size-4 transition-transform duration-300', open && 'rotate-180')} aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="absolute left-0 top-[calc(100%+0.55rem)] z-50 w-[26rem]"
            onMouseEnter={openNow}
            onMouseLeave={scheduleClose}
            role="menu"
            aria-label="Recommended for you"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_70px_-30px_rgba(11,18,32,0.5)]">
              <div aria-hidden className="h-px bg-gradient-to-r from-transparent via-orange/50 to-transparent" />

              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-4 pt-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-orange">
                  <Sparkles className="size-3.5" /> Recommended for you
                </span>
                {calibrated && data?.overall != null ? (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Placement readiness <span className="font-black tabular-nums text-navy">{data.overall}%</span>
                  </span>
                ) : null}
              </div>

              {/* Body */}
              {!data ? (
                <div className="grid h-24 place-items-center">
                  <Loader2 className="size-5 animate-spin text-slate-400" />
                </div>
              ) : !calibrated ? (
                /* Unlock teaser — before the first calibration assessment. */
                <div className="px-4 py-5 text-center">
                  <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717] shadow-sm">
                    <Lock className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-black text-navy">Unlock your recommendations</p>
                  <p className="mx-auto mt-1 max-w-[19rem] text-xs leading-relaxed text-slate-600">
                    Take the quick placement readiness test and we&apos;ll pick the exact company tracks,
                    sections and topics to focus on next.
                  </p>
                  <Link
                    href={calMockHref}
                    onClick={closeNow}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy/90"
                  >
                    Take the placement readiness test <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="px-3 pb-2 pt-3">
                  {best ? (
                    <div className="rounded-xl border border-orange/30 bg-gradient-to-br from-orange/[0.07] to-transparent p-3">
                      <RecoScopeChip r={best} />
                      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-navy">{best.message}</p>
                      {best.reason ? (
                        <p className="mt-1 text-[11px] text-slate-500">Why: {best.reason}</p>
                      ) : null}
                      <div className="mt-2.5">
                        <RecoAction r={best} block />
                      </div>
                    </div>
                  ) : null}

                  {rest.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {rest.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-slate-50"
                        >
                          <span className="min-w-0 flex-1">
                            <RecoScopeChip r={r} />
                            <span className="mt-1 block truncate text-[12px] leading-snug text-slate-600">{r.message}</span>
                          </span>
                          <RecoAction r={r} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                <Link
                  href="/recommendations"
                  onClick={closeNow}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange transition-colors hover:text-[#d9610f]"
                >
                  See all recommendations <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/cart"
                  onClick={closeNow}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-navy"
                >
                  <ShoppingCart className="size-3.5" /> Cart
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
