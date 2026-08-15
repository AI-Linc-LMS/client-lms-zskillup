'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { PROFILE_GATE_ENABLED } from '@/lib/profile/completion';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { cn } from '@/lib/utils';

/**
 * Gates a feature behind the profile ESSENTIALS (name, phone, college - see
 * lib/profile/completion). Until they're on file the real section is shown as a
 * blurred teaser with a lock card + "Complete profile" CTA; once they are (and
 * for non-students) the children render untouched. Re-checks on focus, so
 * filling the profile in another tab unlocks this one on return. UI-level gate
 * - the onboarding nudge, not a security boundary.
 *
 * Was "100% of all 8 fields" until 2026-08-14. The 4-step onboarding wizard was
 * the only flow that filled 7 of those 8 in one pass, and students are no longer
 * routed into it (they land on the dashboard instead), so an un-onboarded
 * student is now the normal case - an 8/8 bar would have blurred out practice,
 * mocks and assessments for essentially everyone. The full 8-field score is
 * still shown here as the progress bar and still drives the dashboard banner;
 * it just no longer decides the lock.
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
  const { loading, essentialsComplete, percent, essentialsMissing } = useProfileCompletion();

  // Disabled by default (see PROFILE_GATE_ENABLED). Returned BEFORE the loading
  // branch on purpose: with no gate to decide, these pages must not sit behind a
  // spinner waiting on /me.
  if (!PROFILE_GATE_ENABLED) return <div className={contentClassName}>{children}</div>;

  if (loading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (essentialsComplete) return <div className={contentClassName}>{children}</div>;

  // Name the fields that actually unlock this page, not every unfilled field -
  // asking for 8 things when 3 open the door is what made this read as a wall.
  const missingText = essentialsMissing.join(', ');

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
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ffd24d] via-[#ffc42d] to-[#f5b400] text-[#171717]">
            <Lock className="size-6" />
          </span>
          {/* Leads with the ACTION, not the wall. "{feature} is locked" told a brand-new
              student what they couldn't do; it never told them what to do next. */}
          <h2 className="mt-4 text-lg font-black text-navy">Complete your profile</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            One minute of setup and {feature} opens up - it also sharpens everything we recommend to you.
          </p>

          <div className="mx-auto mt-4 max-w-xs">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="uppercase tracking-wider text-slate-500">Profile</span>
              <span className="tabular-nums text-[#f5b400]">{percent}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] transition-[width] duration-700"
                style={{ width: `${percent}%` }}
              />
            </div>
            {essentialsMissing.length > 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                To unlock, add your {missingText}.
              </p>
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
