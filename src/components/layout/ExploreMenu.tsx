'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ASSESSMENT_PLATFORMS, DEMO_COMPANIES, EXPLORE_TRACKS } from '@/lib/demo-data';

/**
 * Explore mega-menu — matches the demo prototype's three-column layout
 * (TRACKS · PLATFORMS · COMPANIES) plus the ZSkillup Plus promo card.
 *
 * Open/close model (CLAUDE.md §4.13 interactions):
 *
 *  - Hover-in on either the trigger button OR the dropdown opens immediately.
 *  - Hover-out starts a short close timer (150ms). Re-entering either region
 *    cancels the timer. This is the standard mega-menu pattern — without the
 *    delay, the small visual gap between the trigger and the full-width panel
 *    closes the menu as the cursor crosses it (the original bug the QA audit
 *    surfaced — the menu disappeared the moment the user tried to click a
 *    track or platform).
 *  - Click on the trigger toggles open/closed (keyboard- and tap-friendly).
 *  - Escape closes. Click outside closes.
 *  - Clicking any link inside closes immediately so the next page is unobstructed.
 */
export function ExploreMenu() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  // Escape + click-outside (only registered while open).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeNow();
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) closeNow();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open, closeNow]);

  // Clear any pending timer on unmount.
  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <div
      ref={rootRef}
      className="hidden lg:block"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => (open ? closeNow() : openNow())}
        className={cn(
          'flex items-center gap-1 text-sm font-medium transition-colors',
          open ? 'text-navy' : 'text-slate-600 hover:text-navy',
        )}
      >
        Explore
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          // The panel is the FULL width of the viewport beneath the TopBar.
          // Wrapping a hover-friendly region around it (handlers below) so the
          // cursor crossing the small visual gap from the trigger doesn't fire
          // a real mouseLeave on the root.
          className="absolute left-0 right-0 top-14 z-40 border-b border-slate-200 bg-white shadow-md"
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          role="menu"
          aria-label="Explore"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-12 gap-8 px-6 py-8">
            {/* TRACKS */}
            <div className="col-span-2">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Tracks
              </p>
              <ul className="space-y-2.5">
                {EXPLORE_TRACKS.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      onClick={closeNow}
                      className="text-sm text-slate-700 transition-colors hover:text-orange"
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* PLATFORMS */}
            <div className="col-span-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Platforms
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ASSESSMENT_PLATFORMS.map((p) => (
                  <Link
                    key={p}
                    href={`/prepare?platform=${encodeURIComponent(p.toLowerCase())}`}
                    onClick={closeNow}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-orange hover:text-navy"
                  >
                    <span className="grid size-6 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                      {p.slice(0, 2).toUpperCase()}
                    </span>
                    {p}
                  </Link>
                ))}
              </div>
            </div>

            {/* COMPANIES */}
            <div className="col-span-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Companies
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_COMPANIES.slice(0, 9).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/dashboard/company/${c.slug}`}
                    onClick={closeNow}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-orange hover:text-navy"
                  >
                    <span className="grid size-6 place-items-center rounded bg-slate-100 text-[10px] font-bold text-slate-500">
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    {c.name}
                  </Link>
                ))}
              </div>
              <Link
                href="/dashboard/company"
                onClick={closeNow}
                className="mt-3 inline-block text-sm font-semibold text-orange hover:underline"
              >
                All companies &rarr;
              </Link>
            </div>

            {/* ZSkillup Plus promo card */}
            <div className="col-span-2">
              <div className="rounded-xl bg-gradient-to-b from-orange to-amber-500 p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                  ZSkillup Plus
                </p>
                <p className="mt-2 text-sm leading-relaxed">
                  Full company tracks, video walkthroughs, and adaptive mocks &mdash;
                  practice like the real drive.
                </p>
                <Link
                  href="/prepare"
                  onClick={closeNow}
                  className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-orange transition-colors hover:bg-white/90"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
