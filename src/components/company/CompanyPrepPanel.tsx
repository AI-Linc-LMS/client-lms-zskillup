'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Layers, Loader2, Sparkles, UserRound } from 'lucide-react';
import { getCompanyPrep, type ApiCompanyPrep } from '@/lib/api/catalog';

/**
 * Dynamic "Practice" tab for the company hub — driven entirely by the live
 * question bank (GET /companies/:slug/prep): year-wise previous-year papers,
 * target roles, and all topics with question counts. Every card deep-links into
 * the real practice engine (/practice?company=…&year=… or &subtopic=…).
 */
export function CompanyPrepPanel({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const [prep, setPrep] = useState<ApiCompanyPrep | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCompanyPrep(companySlug)
      .then((p) => {
        if (!cancelled) setPrep(p);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

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
          Real questions from the live bank — by year, by role, and by topic. Every card drops you
          straight into the practice engine.
        </p>
      </div>

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

      {/* Target roles */}
      {prep.roles.length ? (
        <section>
          <SectionHead icon={UserRound} title="Target roles" sub={`Roles ${companyName} hires for`} />
          <div className="flex flex-wrap gap-2">
            {prep.roles.map((r) => (
              <span
                key={r}
                className="rounded-full bg-violet-50 px-3.5 py-1.5 text-[13px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200"
              >
                {r}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* All topics */}
      {prep.topics.length ? (
        <section>
          <SectionHead icon={Layers} title="All topics" sub="Start a mock quiz on any topic" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prep.topics.map((t) => (
              <Link
                key={t.slug}
                href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(t.slug)}&company=${encodeURIComponent(companySlug)}`}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-32px_rgba(124,58,237,0.2)] transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_22px_50px_-28px_rgba(124,58,237,0.4)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-navy">{t.name}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-violet-600" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {prep.years.length === 0 && prep.topics.length === 0 ? (
        <p className="text-sm text-slate-500">No practice content yet for {companyName}.</p>
      ) : null}
    </div>
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
