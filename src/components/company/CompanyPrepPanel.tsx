'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Layers, Loader2, Search, Sparkles, TrendingUp } from 'lucide-react';
import { getCompanyPrep, type ApiCompanyPrep } from '@/lib/api/catalog';
import { getTopicAccuracy, type ApiTopicAccuracy } from '@/lib/api/practice';
import { cn } from '@/lib/utils';

/**
 * Dynamic "Practice" tab for the company hub — driven by the live question bank
 * (GET /companies/:slug/prep): year-wise previous-year papers and all topics
 * with question counts. Overlays the student's own practice progress (per-topic
 * accuracy from GET /me/practice/topic-accuracy) and lets them search + filter
 * the topics. Every card deep-links into the real adaptive practice engine.
 */

type TopicFilter = 'all' | 'pyq' | 'not-started' | 'needs-work' | 'strong';

const FILTERS: { key: TopicFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pyq', label: 'With PYQs' },
  { key: 'not-started', label: 'Not started' },
  { key: 'needs-work', label: 'Needs work' },
  { key: 'strong', label: 'Strong' },
];

/** Accuracy → tonal colours (rose / amber / emerald). */
function accTone(pct: number): { bar: string; text: string } {
  if (pct >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-rose-500', text: 'text-rose-500' };
}

export function CompanyPrepPanel({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const [prep, setPrep] = useState<ApiCompanyPrep | null>(null);
  const [errored, setErrored] = useState(false);
  const [accBySlug, setAccBySlug] = useState<Record<string, ApiTopicAccuracy>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TopicFilter>('all');

  useEffect(() => {
    let cancelled = false;
    getCompanyPrep(companySlug)
      .then((p) => {
        if (!cancelled) setPrep(p);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    // Per-topic practice progress for THIS company (best-effort — absent = "not started").
    // Scoped deliberately: this panel is headed "Your progress across <Company>'s topics",
    // and calling it unscoped returned the student's progress across EVERY company — so a
    // quiz finished in the Accenture hub showed the topic as practised here too.
    getTopicAccuracy(companySlug)
      .then((rows) => {
        if (!cancelled) setAccBySlug(Object.fromEntries(rows.map((r) => [r.topicSlug, r])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  // Progress rollup across this company's topics.
  const progress = useMemo(() => {
    if (!prep) return null;
    let practiced = 0;
    let attempted = 0;
    let correct = 0;
    for (const t of prep.topics) {
      const a = accBySlug[t.slug];
      if (a && a.total > 0) {
        practiced += 1;
        attempted += a.total;
        correct += a.correct;
      }
    }
    return {
      practiced,
      total: prep.topics.length,
      attempted,
      accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
    };
  }, [prep, accBySlug]);

  const filteredTopics = useMemo(() => {
    if (!prep) return [];
    const q = query.trim().toLowerCase();
    return prep.topics.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q)) return false;
      const a = accBySlug[t.slug];
      const attempts = a?.total ?? 0;
      const pct = a?.accuracyPct ?? 0;
      switch (filter) {
        case 'pyq':
          return t.pyqCount > 0;
        case 'not-started':
          return attempts === 0;
        case 'needs-work':
          return attempts > 0 && pct < 50;
        case 'strong':
          return attempts > 0 && pct >= 75;
        default:
          return true;
      }
    });
  }, [prep, accBySlug, query, filter]);

  if (errored) {
    return <p className="text-sm text-slate-500">Couldn&apos;t load practice content. Please refresh.</p>;
  }
  if (!prep) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-violet-600 ring-1 ring-inset ring-violet-100">
          <Sparkles className="size-3.5" /> Practice library
        </span>
        <h2 className="mt-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
          Practice {companyName}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 sm:text-base">
          Real questions from the live bank — by year and by topic. Every card drops you straight into
          the practice engine.
        </p>
      </div>

      {/* Progress tracking */}
      {progress && progress.total > 0 ? (
        <ProgressCard progress={progress} companyName={companyName} />
      ) : null}

      {/* Year-wise previous year papers */}
      {prep.years.length ? (
        <section>
          <SectionHead icon={CalendarClock} title="Previous year papers" sub="Real questions, by the year they were asked" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {prep.years.map((y) => (
              <Link
                key={y.year}
                href={`/dashboard/quiz/adaptive?company=${companySlug}&year=${y.year}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(124,58,237,0.22)] transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_22px_50px_-26px_rgba(124,58,237,0.45)]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/60 via-transparent to-transparent"
                />
                <p className="relative text-2xl font-black tracking-tight tabular-nums text-navy">{y.year}</p>
                <span className="relative mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600">
                  Practice <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* All topics — searchable, filterable, with per-topic progress */}
      {prep.topics.length ? (
        <section>
          <SectionHead icon={Layers} title="All topics" sub="Search, filter and start a mock quiz on any topic" />

          {/* Toolbar: search + filter */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics…"
                aria-label="Search topics"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-navy shadow-sm transition focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter topics">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mb-3 text-xs font-medium text-slate-400">
            <span className="tabular-nums font-bold text-navy">{filteredTopics.length}</span> of{' '}
            <span className="tabular-nums">{prep.topics.length}</span> topics
          </p>

          {filteredTopics.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTopics.map((t) => (
                <TopicCard
                  key={t.slug}
                  name={t.name}
                  count={t.count}
                  pyqCount={t.pyqCount}
                  acc={accBySlug[t.slug]}
                  href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(t.slug)}&company=${encodeURIComponent(companySlug)}`}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
              <p className="text-sm font-semibold text-navy">No topics match your search.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
                className="mt-1 text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                Clear search &amp; filters
              </button>
            </div>
          )}
        </section>
      ) : null}

      {prep.years.length === 0 && prep.topics.length === 0 ? (
        <p className="text-sm text-slate-500">No practice content yet for {companyName}.</p>
      ) : null}
    </div>
  );
}

/** Progress rollup card — coverage + attempts + accuracy across the company's topics. */
function ProgressCard({
  progress,
  companyName,
}: {
  progress: { practiced: number; total: number; attempted: number; accuracy: number };
  companyName: string;
}) {
  const { practiced, total, attempted, accuracy } = progress;
  const coverage = total > 0 ? Math.round((practiced / total) * 100) : 0;
  const started = attempted > 0;
  return (
    <section className="rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-[0_18px_50px_-34px_rgba(124,58,237,0.3)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
          <TrendingUp className="size-4" />
        </span>
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-navy sm:text-lg">Your progress</h3>
          <p className="text-[12px] leading-relaxed text-slate-500">
            {started
              ? `Your practice across ${companyName}'s topics`
              : `Start practicing to track your progress across ${companyName}'s topics`}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Topics practiced" value={`${practiced}/${total}`} />
        <Metric label="Questions" value={attempted.toLocaleString()} />
        <Metric label="Accuracy" value={started ? `${accuracy}%` : '—'} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-500">Topic coverage</span>
          <span className="tabular-nums text-navy">{coverage}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-700 transition-[width] duration-700"
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-inset ring-violet-100">
      <p className="text-lg font-black tracking-tight tabular-nums text-navy sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}

/** One topic card — question counts + the student's per-topic progress. */
function TopicCard({
  name,
  count,
  pyqCount,
  acc,
  href,
}: {
  name: string;
  count: number;
  pyqCount: number;
  acc: ApiTopicAccuracy | undefined;
  href: string;
}) {
  const attempts = acc?.total ?? 0;
  const pct = acc?.accuracyPct ?? 0;
  const tone = accTone(pct);
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-32px_rgba(124,58,237,0.2)] transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_22px_50px_-28px_rgba(124,58,237,0.4)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-navy">{name}</span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            {count} question{count === 1 ? '' : 's'}
            {pyqCount > 0 ? ` · ${pyqCount} PYQ` : ''}
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-violet-600" />
      </div>

      <div className="mt-3">
        {attempts > 0 ? (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className={cn('font-bold', tone.text)}>{pct}% accuracy</span>
              <span className="text-slate-400">{attempts} attempted</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.max(4, pct)}%` }} />
            </div>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span className="size-1.5 rounded-full bg-slate-300" /> Not started
          </span>
        )}
      </div>
    </Link>
  );
}

function SectionHead({
  icon: Icon,
  title,
  sub,
}: {
  icon: typeof Layers;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-100">
          <Icon className="size-4" />
        </span>
        <h3 className="text-lg font-extrabold tracking-tight text-navy sm:text-xl">{title}</h3>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{sub}</p>
    </div>
  );
}
