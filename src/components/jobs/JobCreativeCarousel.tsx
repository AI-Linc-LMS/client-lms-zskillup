'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { JobCreativeDto } from '@/shared/dto/jobs.dto';

/** How long each creative holds before the row advances. */
const DWELL_MS = 4500;

/**
 * PLACEMENT CREATIVES ON THE PUBLIC JOB PAGE (additional requirement 3).
 *
 * BUILT ON NATIVE SCROLL-SNAP, NOT A JS ANIMATION LOOP.
 *
 * The requirement asks for automatic movement, smooth animation, swipe on mobile and
 * arrows on desktop, and explicitly that it "should not slow down the Job Board" — §11
 * puts the budget at LCP under 2.5s. A scroll container with snap points gets swipe,
 * momentum and keyboard scrolling from the browser for free and advances by calling
 * scrollTo once every few seconds, so nothing runs per frame. A requestAnimationFrame
 * translating a track would hold the main thread for the whole time the page is open,
 * on a page whose job is to load fast.
 *
 * ONE IMAGE IS NOT A CAROUSEL. With a single creative it renders as a plain image: no
 * timer, no arrows, no dots. Auto-advancing a row of one is motion with no information.
 *
 * REDUCED MOTION STOPS THE TIMER, not the component. Someone who has asked for less
 * motion still gets every image, still swipes, still uses the arrows — they simply are
 * not moved without asking.
 */
export function JobCreativeCarousel({
  creatives,
  className = '',
}: {
  creatives: JobCreativeDto[];
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const many = creatives.length > 1;

  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = ((i % creatives.length) + creatives.length) % creatives.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  }, [creatives.length]);

  useEffect(() => {
    if (!many || paused) return undefined;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;
    const t = setInterval(() => goTo(index + 1), DWELL_MS);
    return () => clearInterval(t);
  }, [index, many, paused, goTo]);

  // Keep the dots honest when somebody swipes instead of using the arrows.
  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const at = Math.round(el.scrollLeft / el.clientWidth);
    if (at !== index) setIndex(at);
  };

  if (creatives.length === 0) return null;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-xl border border-slate-200 bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Drive creatives"
      >
        {creatives.map((c, i) => (
          <div key={c.id} className="relative aspect-[16/9] w-full shrink-0 snap-center">
            <Image
              src={c.url}
              alt={c.alt ?? ''}
              fill
              unoptimized
              /* The cover is the LCP candidate on this page, so it loads eagerly and the
                 rest stay lazy — otherwise four posters compete with the one that matters. */
              priority={i === 0}
              loading={i === 0 ? undefined : 'lazy'}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 60vw"
            />
          </div>
        ))}
      </div>

      {many ? (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-navy shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/95 text-navy shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/40"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="mt-3 flex justify-center gap-1.5">
            {creatives.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1} of ${creatives.length}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-colors ${
                  i === index ? 'w-6 bg-navy' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
