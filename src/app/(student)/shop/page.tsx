'use client';

import Link from 'next/link';
import { ArrowRight, Check, Crown, Puzzle, Sparkles } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { FeatureItem, PlanPill, SecurePaymentsNote, TrustBadges } from '@/components/billing/plan-ui';
import { useMySubscription } from '@/hooks/useMySubscription';

const PLATFORM_FEATURES = [
  'All Companies & Company Hubs',
  'All Sections',
  'All Sub-topics & Topics',
  'All Practice Tests & Mocks',
  'Performance Analytics',
  'All Upcoming Updates',
];

const CUSTOM_FEATURES = [
  'Choose specific Company or Company Hub',
  'Choose Sections',
  'Choose Sub-topics / Topics',
  'Select your access plan',
  'Pay only for what you add',
];

/**
 * Explore Plans — the entry to the buying flow. "How would you like to prepare?"
 * with two paths: Full Platform Access (all-access) or Build Your Own Plan
 * (à-la-carte). Full Platform → /shop/full, Build Your Own → /shop/build.
 */
export default function ExplorePlansPage() {
  const { hasPlatform } = useMySubscription();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumb items={[{ label: 'Explore Plans' }]} />

      <header className="mt-4">
        <h1 className="text-2xl font-black tracking-tight text-navy">Explore Plans</h1>
        <p className="mt-1 text-sm text-slate-500">Choose the way you want to prepare.</p>
      </header>

      {hasPlatform && (
        <Link
          href="/upgrade"
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
        >
          <span className="inline-flex items-center gap-2">
            <Crown className="size-4" /> You already have Full Platform access — manage it in Upgrade &amp; Renew.
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      )}

      <div className="mt-8 text-center">
        <h2 className="inline-block text-lg font-black tracking-tight text-navy">
          How would you like to prepare?
        </h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-indigo-500" />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Full Platform Access */}
        <div data-tour="plans:full" className="flex flex-col rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-indigo-50 ring-1 ring-indigo-100">
              <Crown className="size-8 text-indigo-600" />
            </span>
            <h3 className="mt-4 text-xl font-black tracking-tight text-navy">Full Platform Access</h3>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm text-slate-500">
              Get unlimited access to everything on Prephasz
            </p>
          </div>
          <div className="my-5 h-px bg-slate-100" />
          <ul className="space-y-2.5">
            {PLATFORM_FEATURES.map((f) => (
              <FeatureItem key={f} tone="violet">
                {f}
              </FeatureItem>
            ))}
          </ul>
          <div className="mt-4">
            <PlanPill tone="emerald">Best Value</PlanPill>
          </div>
          <Link
            href="/shop/full"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Crown className="size-4" /> Get Full Access
          </Link>
        </div>

        {/* Build Your Own Plan */}
        <div data-tour="plans:build" className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <div className="text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-sky-50 ring-1 ring-sky-100">
              <Puzzle className="size-8 text-sky-600" />
            </span>
            <h3 className="mt-4 text-xl font-black tracking-tight text-navy">Build Your Own Plan</h3>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm text-slate-500">
              Customize and pay only for what you need
            </p>
          </div>
          <div className="my-5 h-px bg-slate-100" />
          <ul className="space-y-2.5">
            {CUSTOM_FEATURES.map((f) => (
              <FeatureItem key={f} tone="slate">
                {f}
              </FeatureItem>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Check className="size-3.5 text-emerald-500" /> Mix &amp; match — different validity per item
          </div>
          <Link
            href="/shop/build"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
          >
            Start Customizing <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      <SecurePaymentsNote className="mt-8" />
      <TrustBadges className="mt-4" />

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <Sparkles className="size-3.5 text-indigo-400" />
        Prices are shown at the next step — no charge until you review and pay.
      </p>
    </div>
  );
}
