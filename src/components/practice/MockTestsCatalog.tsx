'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Target, Clock, FileText, Sparkles, Star, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stagger, StaggerItem } from '@/components/motion/primitives';
import { listMocks, type ApiMockSummary } from '@/lib/api/mocks';

/**
 * Live mock-test catalog (Sprint 4). Reads the active mocks from the backend and
 * routes each "Start" into the real timed runner at `/dashboard/quiz?mock=<id>`.
 * Client component because the API client attaches the in-memory access token.
 */
export function MockTestsCatalog({
  filter = 'all',
}: {
  /** 'adaptive' = Mock Quiz (self-practice); 'plain' = non-adaptive; 'all'. */
  filter?: 'all' | 'adaptive' | 'plain';
} = {}) {
  const [mocks, setMocks] = useState<ApiMockSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listMocks()
      .then((rows) => {
        if (!cancelled) {
          setMocks(
            filter === 'adaptive'
              ? rows.filter((m) => m.isAdaptive)
              : filter === 'plain'
                ? rows.filter((m) => !m.isAdaptive)
                : rows,
          );
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Could not load mock tests.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((k) => (
          <div
            key={k}
            className="h-52 animate-pulse rounded-3xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="flex items-start gap-3 p-6">
              <div className="size-12 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-3/4 rounded bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!mocks || mocks.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
        />
        <div className="relative z-10">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f7a14e] to-[#f37021] text-white shadow-sm">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-bold text-navy">No mock tests are live yet.</p>
          <p className="mt-1 text-sm text-slate-500">
            Check back soon — new timed drives are added regularly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Stagger className="grid gap-5 md:grid-cols-2">
      {mocks.map((mock) => (
        <StaggerItem key={mock.id} className="h-full">
          <MockCard mock={mock} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/** A single premium mock card — layered depth, gradient icon chip, info chips,
 *  a confident gradient Start CTA, and a hover lift with an intensifying glow. */
function MockCard({ mock }: { mock: ApiMockSummary }) {
  const adaptive = mock.isAdaptive;
  const from = '#f7a14e';
  const to = '#f37021';
  const glow = '#f37021';
  const href = adaptive
    ? `/dashboard/quiz/adaptive?mock=${mock.id}`
    : `/dashboard/quiz?mock=${mock.id}`;
  const Icon = adaptive ? Target : Timer;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }} className="h-full">
      <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] transition-shadow duration-300 hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.5)]">
        {/* faint gradient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/70 via-transparent to-transparent"
        />
        {/* colored glow blob — intensifies on hover-lift */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ background: glow }}
        />
        {/* top-edge highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"
        />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start gap-3.5">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              <Icon className="size-[22px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold leading-snug text-navy">{mock.title}</p>
                {adaptive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-orange/25 bg-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange">
                    <Sparkles className="size-2.5" /> Mock Quiz
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                {adaptive ? 'Adjusts to your level' : 'Timed mock assessment'}
              </p>
            </div>
          </div>

          {/* Info chips — questions / duration / pass mark */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <InfoChip
              icon={<FileText className="size-4" aria-hidden="true" />}
              value={String(mock.totalQuestions)}
              label={adaptive ? 'max Qs' : 'Questions'}
            />
            <InfoChip
              icon={<Clock className="size-4" aria-hidden="true" />}
              value={`${mock.durationMinutes}`}
              label="Minutes"
            />
            <InfoChip
              icon={<Star className="size-4" aria-hidden="true" />}
              value={`${mock.passingScore}%`}
              label="Pass mark"
            />
          </div>

          {/* CTA */}
          <div className="mt-auto pt-6">
            <Link
              href={href}
              aria-label={`Start ${mock.title}`}
              className="group/cta relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold text-white shadow-[0_14px_34px_-14px_rgba(243,112,33,0.85)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
              />
              {adaptive ? (
                <Sparkles className="size-4" aria-hidden="true" />
              ) : (
                <Timer className="size-4" aria-hidden="true" />
              )}
              {adaptive ? 'Start mock quiz' : 'Start test'}
              <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** A single stat chip inside a mock card. */
function InfoChip({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-2 py-3 text-center',
        className,
      )}
    >
      <span className="text-slate-400">{icon}</span>
      <span className="text-base font-extrabold leading-none tracking-tight text-navy tabular-nums">
        {value}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}
