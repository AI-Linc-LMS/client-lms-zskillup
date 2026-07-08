'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck, Loader2 } from 'lucide-react';
import { useCalibrationStatus } from '@/hooks/useCalibrationStatus';
import { cn } from '@/lib/utils';

/**
 * Gates a feature behind the one-time calibration assessment. Until the student
 * takes it (and while the feature flag is on) the real section renders under a
 * translucent blur film with a lock card + "Take the calibration" CTA; otherwise
 * the children render untouched. Mirrors ProfileLockGate; re-checks on focus.
 */
export function CalibrationLockGate({
  feature,
  contentClassName,
  children,
}: {
  feature: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const { loading, required, mockTestId } = useCalibrationStatus();

  if (loading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-300" />
      </div>
    );
  }
  if (!required) return <div className={contentClassName}>{children}</div>;

  const href = mockTestId ? `/dashboard/quiz?mock=${mockTestId}` : '/dashboard';

  return (
    <div className="relative">
      <div
        aria-hidden
        className={cn('pointer-events-none select-none blur-[7px] opacity-70 saturate-[0.65]', contentClassName)}
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 grid place-items-center rounded-3xl bg-white/50 p-4 backdrop-blur-[3px]">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-7 text-center shadow-[0_30px_80px_-30px_rgba(11,18,32,0.55)]">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-[0_10px_24px_-10px_rgba(243,112,33,0.8)]">
            <ClipboardCheck className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-black text-navy">{feature} is locked</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Take your calibration assessment first — it maps where you stand across every section and unlocks {feature}
            {' '}plus personalized recommendations and your company matches.
          </p>
          <Link
            href={href}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f7a14e] to-[#f37021] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
          >
            Take the calibration <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
