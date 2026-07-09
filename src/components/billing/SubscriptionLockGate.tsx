'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Loader2, Lock, Puzzle } from 'lucide-react';
import { useCareerAccess, type CareerTool } from '@/hooks/useCareerAccess';
import { cn } from '@/lib/utils';

/**
 * Subscription lock for the bundled career tools (Mock Interview, Resume Builder).
 * They come with a Company hub or the Full Platform plan; unpaid students get one
 * free run, then the page renders blurred behind an upsell card. Fails OPEN (the
 * hook never locks on error) and stays open entirely while the paywall is off.
 */
export function SubscriptionLockGate({
  tool,
  feature,
  contentClassName,
  children,
}: {
  tool: CareerTool;
  feature: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const { loading, locked } = useCareerAccess(tool);

  if (loading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!locked) {
    return <div className={contentClassName}>{children}</div>;
  }

  return (
    <div className="relative">
      <div aria-hidden className={cn('pointer-events-none select-none blur-[7px] opacity-70 saturate-[0.65]', contentClassName)}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 rounded-3xl bg-white/50 backdrop-blur-[3px]" />
      <div className="sticky top-0 z-20 flex h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-indigo-200 bg-white p-7 text-center shadow-xl">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <Lock className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-black tracking-tight text-navy">{feature} is a premium feature</h2>
          <p className="mt-2 text-sm text-slate-500">
            You&apos;ve used your free {feature.toLowerCase()}. It&apos;s bundled with any{' '}
            <span className="font-semibold text-navy">Company hub</span> or the{' '}
            <span className="font-semibold text-navy">Full Platform</span> plan — unlock unlimited access.
          </p>

          <div className="mt-5 space-y-2.5">
            <Link
              href="/shop/full"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              <Crown className="size-4" /> Get Full Platform Access
            </Link>
            <Link
              href="/shop/build"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-navy transition hover:bg-slate-50"
            >
              <Puzzle className="size-4 text-sky-600" /> Buy a Company hub
            </Link>
          </div>

          <Link
            href="/shop"
            className="mt-4 inline-flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            See all plans <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
