'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Flame, Loader2, Star, Trophy } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { getAssessmentLeaderboard, type AssessmentLeaderboard } from '@/lib/api/scheduling';
import { cn } from '@/lib/utils';

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-xs font-black text-white"
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

const toneFor = (pct: number) =>
  pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444';

export default function AssessmentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lb, setLb] = useState<AssessmentLeaderboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getAssessmentLeaderboard(id).then(setLb).catch(() => setErr('Could not load this leaderboard.'));
  }, [id]);

  if (err) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">{err}</p>
      </div>
    );
  }
  if (!lb) {
    return <div className="grid h-72 place-items-center"><Loader2 className="size-6 animate-spin text-slate-500" /></div>;
  }

  const podium = lb.entries.slice(0, 3);
  const rest = lb.entries.slice(3);

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assessments', href: '/assessments' },
          { label: 'Leaderboard' },
        ]}
      />

      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a0a0c] via-[#0d0e13] to-[#141a2e] p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-1/4 -top-1/2 size-[44vw] rounded-full bg-[#ffc42d]/20 blur-[120px]" />
          <div className="absolute -right-1/4 -bottom-1/2 size-[40vw] rounded-full bg-[#f5b400]/20 blur-[120px]" />
        </div>
        <div className="relative z-10">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffc42d]">
            <Trophy className="size-3.5" /> Assessment leaderboard
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">{lb.assessment.title}</h1>
          <p className="mt-1 text-sm text-white/60">{lb.assessment.companyName} · {lb.total} participant{lb.total === 1 ? '' : 's'}</p>

          {lb.myRank ? (
            <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 backdrop-blur">
              <span className="text-sm font-bold">Your result</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-extrabold">Rank #{lb.myRank}</span>
              {lb.myPercentile != null ? (
                <span className="rounded-full bg-[#ffc42d]/20 px-2.5 py-1 text-xs font-extrabold text-[#ffc42d]">
                  {lb.myPercentile}th percentile
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs text-white/50">Take this assessment to appear on the leaderboard.</p>
          )}
        </div>
      </section>

      {/* Podium */}
      {podium.length >= 3 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[podium[1], podium[0], podium[2]].map((e, i) => {
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            return (
              <div
                key={e.userId}
                className={cn(
                  'flex flex-col items-center rounded-2xl border bg-white p-4 text-center',
                  place === 1 ? 'border-amber-300 sm:-translate-y-2' : 'border-slate-200',
                )}
              >
                <span className={cn('mb-1 text-xs font-black', place === 1 ? 'text-amber-500' : 'text-slate-500')}>#{place}</span>
                <Avatar src={e.avatarUrl} name={e.name} size={place === 1 ? 56 : 46} />
                <p className="mt-2 truncate text-sm font-bold text-navy">{e.name}</p>
                <p className="truncate text-[11px] text-slate-500">{e.collegeName ?? '-'}</p>
                <p className="mt-1 text-lg font-black" style={{ color: toneFor(e.scorePct) }}>{e.scorePct}%</p>
                <p className="text-[10px] font-semibold text-slate-500">{e.percentile}th pct · Lv {e.level}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Section-wise percentile */}
      {lb.sections.length ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your section-wise percentile</p>
          <ul className="mt-3 space-y-3">
            {lb.sections.map((s) => (
              <li key={s.section}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy">{s.section}</span>
                  <span className="text-slate-600">
                    {s.correct}/{s.total} · {s.accuracyPct}% ·{' '}
                    <b style={{ color: toneFor(s.percentile) }}>{s.percentile}th pct</b>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${s.percentile}%`, background: toneFor(s.percentile) }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Full ranking */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rankings</p>
          <Link href="/assessments" className="inline-flex items-center gap-1 text-xs font-bold text-[#f5b400] hover:underline">
            <ArrowLeft className="size-3.5" /> Calendar
          </Link>
        </div>
        {lb.entries.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-600">No submissions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(podium.length >= 3 ? rest : lb.entries).map((e) => (
              <li
                key={e.userId}
                className={cn('flex items-center gap-3 px-4 py-3', e.isYou && 'bg-orange/[0.05]')}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-xs font-black',
                    e.rank === 1 ? 'bg-amber-100 text-amber-700'
                      : e.rank === 2 ? 'bg-slate-200 text-slate-600'
                      : e.rank === 3 ? 'bg-orange-100 text-orange-700'
                      : 'text-slate-500',
                  )}
                >
                  {e.rank}
                </span>
                <Avatar src={e.avatarUrl} name={e.name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-navy">
                    {e.name} {e.isYou ? <span className="ml-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">You</span> : null}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{e.collegeName ?? '-'}</p>
                </div>
                <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600 sm:inline-flex" title="Streak"><Flame className="size-3" /> {e.currentStreakDays}d</span>
                <span className="hidden items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600 sm:inline-flex" title="Badges"><Award className="size-3" /> {e.badgesEarned}</span>
                <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 sm:inline-flex" title="Level"><Star className="size-3 text-amber-400" /> Lv {e.level}</span>
                <span className="hidden w-14 shrink-0 text-right text-[11px] font-semibold text-slate-500 sm:inline-block" title="Percentile">{e.percentile}th pct</span>
                <span className="w-12 shrink-0 text-right text-base font-black tabular-nums" style={{ color: toneFor(e.scorePct) }}>{e.scorePct}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
