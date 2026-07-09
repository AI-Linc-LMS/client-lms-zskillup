'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { cn } from '@/lib/utils';

/**
 * Gates a feature behind a 100%-complete profile. Until then the real section is
 * shown as a blurred teaser with a lock card + "Complete profile" CTA; at 100%
 * (and for non-students) the children render untouched. Re-checks on focus, so
 * finishing the profile in another tab unlocks this one on return. UI-level gate
 * — the onboarding nudge, not a security boundary.
 */
export function ProfileLockGate({
  feature,
  contentClassName,
  children,
}: {
  feature: string;
  /** Applied to the content wrapper in both states, so the gated section keeps
   *  its own vertical rhythm (e.g. "space-y-6"). */
  contentClassName?: string;
  children: ReactNode;
}) {
  const { loading, complete, percent, missing } = useProfileCompletion();

  if (loading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-300" />
      </div>
    );
  }
  if (complete) return <div className={contentClassName}>{children}</div>;

  const missingText =
    missing.length <= 3 ? missing.join(', ') : `${missing.slice(0, 3).join(', ')} +${missing.length - 3} more`;

  // Contained lock: the card lives in a normal in-flow block that defines the
  // gate's height (~60vh), with the real section shown as a blurred teaser on an
  // absolute layer clipped by `overflow-hidden`. No sticky / no 100dvh, so the
  // card never follows the scroll or leaves a blank viewport-sized block behind.
  return (
    <div className="relative isolate overflow-hidden rounded-3xl">
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 select-none blur-[7px] opacity-60 saturate-[0.65]', contentClassName)}
      >
        {children}
      </div>
      <div aria-hidden className="absolute inset-0 bg-white/60 backdrop-blur-[3px]" />

      <div className="relative z-10 flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-7 text-center shadow-[0_30px_80px_-30px_rgba(11,18,32,0.55)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)]">
            <Lock className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-black text-navy">{feature} is locked</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Finish your profile to 100% to unlock {feature}. It takes a minute and sharpens everything we recommend.
          </p>

          <div className="mx-auto mt-4 max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="uppercase tracking-wider text-slate-400">Profile</span>
              <span className="tabular-nums text-orange">{percent}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] transition-[width] duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            {missing.length > 0 ? (
              <p className="mt-2 text-[11px] text-slate-400">Still needed: {missingText}</p>
            ) : null}
          </div>

          <Link
            href="/profile"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy/90"
          >
            Complete profile <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
