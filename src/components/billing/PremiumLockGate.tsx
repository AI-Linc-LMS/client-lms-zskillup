'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Crown } from 'lucide-react';
import { useUpgradeGate } from '@/hooks/useUpgradeGate';
import { cn } from '@/lib/utils';

const INCLUDED = [
  'Unlimited practice across every section and topic',
  'Full previous-year banks and mock assessments',
  'Mock Interview and Resume Builder included',
];

/**
 * Premium gate for a whole page (Practice-as-Wish, Mock Interview).
 *
 * Distinct from SubscriptionLockGate, which is bound to the CAREER TOOLS specifically
 * (`useCareerAccess(tool)`, with its one-free-run allowance). This is the general "you are
 * on the free plan" gate, driven by useUpgradeGate — so it is governed by PAYWALL_ENABLED
 * and falls OPEN while the paywall is off, and open for anyone holding any plan.
 *
 * Same contained-blur shape as ProfileLockGate: the real page shows as a blurred teaser
 * behind the card, so the student can see what they are being offered rather than staring
 * at an empty wall.
 */
export function PremiumLockGate({
  feature,
  contentClassName,
  children,
}: {
  feature: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  // `gated` is false while the subscription is still loading (useUpgradeGate requires
  // !loading), so the page renders normally until we KNOW the student is on a free plan.
  // It can never flash a wall at someone who has paid.
  const { gated } = useUpgradeGate();
  if (!gated) return <div className={contentClassName}>{children}</div>;

  return (
    <div className="relative isolate min-h-[60vh] overflow-hidden rounded-3xl">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 select-none blur-[7px] opacity-60 saturate-[0.65]',
          contentClassName,
        )}
      >
        {children}
      </div>
      <div aria-hidden className="absolute inset-0 bg-white/60 backdrop-blur-[3px]" />

      <div className="relative grid min-h-[60vh] place-items-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-7 text-center shadow-[0_30px_80px_-30px_rgba(11,18,32,0.55)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_10px_24px_-10px_rgba(79,70,229,0.8)]">
            <Crown className="size-6" />
          </span>
          {/* Leads with what they GET, not with the word "locked". */}
          <h2 className="mt-4 text-lg font-black text-navy">{feature} is a Premium feature</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Upgrade to unlock it — everything else on your plan stays exactly as it is.
          </p>

          <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2 text-xs text-slate-500">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-navy transition hover:bg-slate-50"
            >
              Explore Plans
            </Link>
            <Link
              href="/shop/full"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Upgrade <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
