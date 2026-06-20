'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Layers, Loader2, UserRound } from 'lucide-react';
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
    <div className="space-y-7">
      {/* Totals strip */}
      <div className="flex flex-wrap gap-3">
        <StatChip icon={Layers} label="Practice questions" value={prep.totals.total.toLocaleString()} />
        <StatChip icon={CalendarClock} label="Previous-year (PYQ)" value={prep.totals.pyq.toLocaleString()} tone="violet" />
      </div>

      {/* Year-wise previous year papers */}
      {prep.years.length ? (
        <section>
          <SectionHead icon={CalendarClock} title="Previous year papers" sub="Real questions, by the year they were asked" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {prep.years.map((y) => (
              <Link
                key={y.year}
                href={`/practice?company=${companySlug}&year=${y.year}`}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_14px_30px_-20px_rgba(124,58,237,0.5)]"
              >
                <p className="text-[22px] font-black tracking-tight text-navy">{y.year}</p>
                <p className="mt-0.5 text-xs text-slate-500">{y.count} questions</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600">
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
                className="rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200"
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
          <SectionHead icon={Layers} title="All topics" sub="Start a mock quiz on any topic — counts are live" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prep.topics.map((t) => (
              <Link
                key={t.slug}
                href={`/dashboard/quiz/adaptive?topic=${encodeURIComponent(t.slug)}&company=${encodeURIComponent(companySlug)}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{t.name}</span>
                  <span className="text-[11px] text-slate-500">{t.count} questions</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-orange" />
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
    <div className="mb-3 flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-bold text-navy">{title}</p>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  tone?: 'emerald' | 'violet';
}) {
  const t =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'violet'
        ? 'text-violet-700'
        : 'text-navy';
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
      <Icon className={`size-4 ${t}`} />
      <span>
        <span className={`block text-lg font-black leading-none tracking-tight ${t}`}>{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      </span>
    </div>
  );
}
