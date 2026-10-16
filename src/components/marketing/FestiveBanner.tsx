'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Ticket } from 'lucide-react';

/**
 * THE DUSSEHRA CAMPAIGN, IN ONE PLACE.
 *
 * Dates are written as explicit IST instants rather than plain dates. A campaign that
 * ends "22 October" ends at midnight somewhere, and on a server in UTC that is half past
 * six in the evening for everyone in India. The end is the START of 23 October IST, so
 * the whole of the 22nd is included exactly as the terms promise.
 *
 * WHEN THE WINDOW PASSES THE BANNER DISAPPEARS BY ITSELF. Nobody has to remember to take
 * it down, and a stale festival banner in December is the kind of thing a visitor
 * notices before anything else on the page.
 */
const CAMPAIGN = {
  code: 'DUSSEHRA25',
  /** The strip goes up now, as a teaser, before the code works. */
  teaserFrom: Date.parse('2026-10-16T00:00:00+05:30'),
  /** 18 Oct 2026, 00:00 IST. The code starts working here. */
  startsAt: Date.parse('2026-10-18T00:00:00+05:30'),
  /** Start of 23 Oct 2026 IST, so all of the 22nd counts. */
  endsAt: Date.parse('2026-10-23T00:00:00+05:30'),
  validLabel: '18 Oct to 22 Oct 2026',
  opensLabel: '18 Oct 2026',
  terms:
    'T&C: Dussehra25 offer is applicable only on the 1-Year Full Platform Access plan. Offer valid till 22 October 2026.',
} as const;

/** How long one full pass takes. Slow enough to read a moving line without chasing it. */
const SCROLL_SECONDS = 38;

/**
 * A FESTIVE OFFER STRIP THAT SCROLLS RIGHT TO LEFT.
 *
 * ON THE DESIGN LAW. §4.13 rules out keyframe animation outside skeletons, and this is a
 * deliberate, owner-requested exception for a dated marketing campaign rather than a new
 * house style. It is contained to this one component, it carries no scale, bounce or
 * spring, and it stops entirely for anyone who has asked their system to reduce motion.
 *
 * WHAT A REDUCED-MOTION VISITOR SEES. Not a frozen marquee with half a sentence cut off
 * at the edge, which is what pausing the animation would give them. They get the same
 * offer laid out as static, centred, wrapping text, so the information is identical and
 * only the movement is gone.
 *
 * THE TERMS TRAVEL WITH THE OFFER. "25% OFF" and "only on the 1-Year plan" belong in the
 * same sentence, because a student who reads the first and not the second arrives at
 * checkout expecting a discount that will not apply to what is in their basket.
 */
export function FestiveBanner() {
  const reduceMotion = useReducedMotion();
  const [live, setLive] = useState(false);
  /**
   * Whether the code actually WORKS yet, which is not the same as whether the strip is
   * up. The strip runs early as a teaser, and in those days it must not tell anybody to
   * type a code that will be refused at checkout: two days of students trying a dead
   * coupon costs more goodwill than the extra two days of promotion buys.
   */
  const [redeemable, setRedeemable] = useState(false);

  useEffect(() => {
    // Decided on the client, after mount: the server renders this page for everyone and
    // a cached HTML copy would otherwise freeze whatever the window happened to be when
    // the page was built.
    const preview =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('festive');
    const now = Date.now();
    setLive(preview || (now >= CAMPAIGN.teaserFrom && now < CAMPAIGN.endsAt));
    setRedeemable(now >= CAMPAIGN.startsAt && now < CAMPAIGN.endsAt);
  }, []);

  if (!live) return null;

  const offer = (
    <>
      <span className="font-serif text-[15px] font-semibold tracking-wide text-orange-200">
        Dussehra Special
      </span>
      <Dot />
      <span className="text-[15px] font-extrabold text-orange-400">25% OFF</span>
      <span className="text-[15px] font-semibold text-white">on prephasz</span>
      <Dot />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1">
        <Ticket className="size-3.5 text-orange-300" aria-hidden />
        {redeemable ? (
          <>
            <span className="text-xs font-medium text-orange-100">Use code</span>
            <span className="text-xs font-extrabold tracking-wider text-orange-300">
              {CAMPAIGN.code}
            </span>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-orange-100">Opens</span>
            <span className="text-xs font-extrabold tracking-wider text-orange-300">
              {CAMPAIGN.opensLabel}
            </span>
          </>
        )}
      </span>
      <Dot />
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-3.5 text-orange-300/80" aria-hidden />
        <span className="text-xs text-orange-100/90">
          {redeemable ? `Valid ${CAMPAIGN.validLabel}` : `Code live ${CAMPAIGN.validLabel}`}
        </span>
      </span>
      <Dot />
      <span className="text-xs text-orange-100/70">{CAMPAIGN.terms}</span>
    </>
  );

  return (
    <aside
      aria-label="Dussehra offer"
      className="relative isolate w-full overflow-hidden border-y border-orange-400/20 bg-navy-900"
    >
      {/* One soft gold glow, matching the dark premium surfaces elsewhere. Not a
          decorative gradient: it lifts the gold text off a flat black strip. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_140%_at_50%_0%,var(--color-orange-900)_0%,transparent_70%)] opacity-60"
      />

      {reduceMotion ? (
        <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-6 py-2.5 text-center">
          {offer}
        </p>
      ) : (
        <div className="flex py-2.5">
          <motion.div
            className="flex shrink-0 items-center gap-3 whitespace-nowrap pr-3"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: SCROLL_SECONDS, ease: 'linear', repeat: Infinity }}
          >
            {/* Two identical passes. Shifting a two-copy track by exactly half its width
                lands copy two where copy one began, so the loop has no visible seam and
                no gap to wait through. The duplicate is hidden from screen readers, which
                would otherwise announce the whole offer twice. */}
            <Pass>{offer}</Pass>
            <Pass ariaHidden>{offer}</Pass>
          </motion.div>
        </div>
      )}
    </aside>
  );
}

/** One full copy of the offer, repeated along the track. */
function Pass({ children, ariaHidden }: { children: React.ReactNode; ariaHidden?: boolean }) {
  return (
    <span
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-3 pl-3"
    >
      {children}
    </span>
  );
}

/** The diya between items. Decorative, so it is hidden from screen readers. */
function Dot() {
  return (
    <span aria-hidden className="select-none text-[13px] leading-none opacity-90">
      🪔
    </span>
  );
}
