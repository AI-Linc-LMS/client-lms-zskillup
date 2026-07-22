'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, HelpCircle, MousePointerClick } from 'lucide-react';
import { useOptionalGuide } from '@/components/guide/GuideProvider';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { useMySubscription } from '@/hooks/useMySubscription';
import { CALIBRATION_GATED_HREFS, PROFILE_GATED_HREFS, PREMIUM_GATED_HREFS } from './nav-config';

/**
 * Top-bar "?" launcher for the platform guide. Opens a small popover: replay the
 * full platform tour anytime, or (when the current page has one AND it's unlocked
 * for this student) take its focused mini-tour. Renders nothing in route groups
 * without a GuideProvider (e.g. /prepare), so the shared top bar never crashes.
 */
export function GuideLauncher() {
  const guide = useOptionalGuide();
  const pathname = usePathname();
  const { complete: profileComplete } = useProfileCompletion();
  const { required: calibrationRequired } = useCalibrationStatus();
  const { planStatus } = useMySubscription(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // A page mini-tour that drills into gated content is only useful once the page
  // is actually unlocked - otherwise it would spotlight the blurred lock overlay.
  const pageLocked =
    (calibrationRequired && CALIBRATION_GATED_HREFS.has(pathname)) ||
    (!profileComplete && PROFILE_GATED_HREFS.has(pathname)) ||
    (planStatus === 'none' && PREMIUM_GATED_HREFS.has(pathname));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!guide) return null;
  const { start, startPageTour, hasPageTour } = guide;
  const pageTourAvailable = hasPageTour && !pageLocked;

  return (
    <div className="relative" ref={ref} data-tour="chrome:guide">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Platform guide"
        className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-navy"
      >
        <HelpCircle className="size-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(11,18,32,0.5)]"
          >
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Platform guide</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                start();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange/10 text-orange">
                <Compass className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-navy">Take the full tour</span>
                <span className="block text-xs text-slate-600">Walk through every module</span>
              </span>
            </button>
            {pageTourAvailable && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  startPageTour();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <MousePointerClick className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy">Explore this page</span>
                  <span className="block text-xs text-slate-600">A quick tour of what&apos;s here</span>
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
