'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  ChevronDown,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getCalibrationResults, type CalibrationResultsDto } from '@/lib/api/recommendations';
import type { ApiMockReport } from '@/lib/api/mocks';
import type { GamificationSummary } from '@/lib/api/gamification-types';
import { MockReportView } from '@/components/practice/MockRunner';

/**
 * The recommendation-centric calibration RESULTS page. Instead of a plain score
 * report, it frames the attempt as a readiness signal: overall band + an AI
 * summary, strengths vs. focus areas by section, which company the student aligns
 * with, and the CSV-engine product recommendations ("unlock this to get X-ready").
 * The raw answer review stays available behind a toggle (reuses MockReportView).
 */
export function CalibrationResults({
  report,
  reward = null,
}: {
  report: ApiMockReport;
  reward?: GamificationSummary | null;
}) {
  const [data, setData] = useState<CalibrationResultsDto | null>(null);
  const [failed, setFailed] = useState(false);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let alive = true;
    getCalibrationResults()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  // Full answer-by-answer review reuses the standard report view.
  if (showReview) {
    return <MockReportView report={report} reward={reward} kind="test" />;
  }

  // Fallback: if the results API fails, don't strand the student - show the plain report.
  if (failed) {
    return <MockReportView report={report} reward={reward} kind="test" />;
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          <p className="text-xs font-semibold">Analysing your placement readiness…</p>
        </div>
      </div>
    );
  }

  return (
    <ResultsView data={data} report={report} onReview={() => setShowReview(true)} />
  );
}

// ── Presentation ──────────────────────────────────────────────────────────────

function ResultsView({
  data,
  report,
  onReview,
}: {
  data: CalibrationResultsDto;
  report: ApiMockReport;
  onReview: () => void;
}) {
  const tone = data.band === 'High' ? 'emerald' : data.band === 'Medium' ? 'amber' : 'orange';
  const best = data.best;
  const rest = useMemo(
    () => data.recommendations.filter((r) => r.id !== best?.id).slice(0, 4),
    [data.recommendations, best?.id],
  );
  const top = data.topCompany;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-bold text-navy">
          <Sparkles className="size-4 shrink-0 text-[#f5b400]" aria-hidden="true" /> Your placement readiness results
        </span>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Dashboard
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero - overall band + AI narrative */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-4 border-b border-slate-100 bg-gradient-to-br from-orange/[0.06] to-transparent px-6 py-7 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <ScoreRing value={data.overall} tone={tone} />
            <div className="min-w-0">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ring-1',
                  tone === 'emerald' && 'bg-emerald-50 text-emerald-700 ring-emerald-100',
                  tone === 'amber' && 'bg-amber-50 text-amber-700 ring-amber-100',
                  tone === 'orange' && 'bg-orange/10 text-[#f5b400] ring-orange/20',
                )}
              >
                <Award className="size-3.5" aria-hidden="true" /> {data.bandLabel}
              </span>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-navy">
                Here's where you stand
              </h1>
              {/* Actual test score (raw performance on this assessment), distinct from readiness */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="font-semibold text-slate-500">
                  Your score
                  <span className="ml-1.5 font-black tabular-nums text-navy">
                    {report.score}/{report.total}
                  </span>
                  <span className="ml-1 font-bold tabular-nums text-slate-400">({report.pct}%)</span>
                </span>
                {report.percentile > 0 ? (
                  <span className="font-semibold text-slate-500">
                    Percentile
                    <span className="ml-1.5 font-black tabular-nums text-navy">{report.percentile}th</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {data.aiSummary && (
            <p className="px-6 py-5 text-[15px] font-medium leading-relaxed text-slate-700">
              {data.aiSummary}
            </p>
          )}
        </section>

        {/* Strengths vs focus areas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard
            icon={<TrendingUp className="size-4" aria-hidden="true" />}
            title="Your strengths"
            accent="emerald"
            empty="Keep practising - your strengths will show here."
            rows={data.strengths}
          />
          <SectionCard
            icon={<Target className="size-4" aria-hidden="true" />}
            title="Focus areas"
            accent="orange"
            empty="No major gaps - nicely balanced!"
            rows={data.gaps}
          />
        </div>

        {/* Full section breakdown */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-600">Section breakdown</h2>
          <div className="space-y-3.5">
            {data.sections.map((s) => (
              <ScoreBar key={s.key} label={s.label} value={s.score} />
            ))}
          </div>
        </section>

        {/* Company alignment */}
        {data.companies.length > 0 && top && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <Building2 className="size-4 text-navy" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Company alignment</h2>
            </div>
            <p className="mb-4 text-[15px] font-semibold leading-relaxed text-navy">
              You align best with <span className="text-[#f5b400]">{top.name}</span> - you're{' '}
              <span className="tabular-nums">{top.readiness}%</span> ready for their pattern.
            </p>
            <div className="space-y-3.5">
              {data.companies.map((c) => (
                <ScoreBar key={c.slug} label={c.name} value={c.readiness} />
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        {best && (
          <section className="rounded-3xl border border-orange/25 bg-white p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-[#f5b400]" aria-hidden="true" />
              <h2 className="text-sm font-black uppercase tracking-wide text-[#f5b400]">Recommended for you</h2>
            </div>

            <Link
              href={best.href}
              className="group block rounded-2xl border border-orange/30 bg-gradient-to-br from-orange/[0.08] to-transparent p-4 transition hover:border-orange/50"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#f5b400]">{best.category}</span>
              <p className="mt-1 text-[15px] font-semibold leading-relaxed text-navy">{best.message}</p>
              {top && (
                <p className="mt-1.5 text-xs font-semibold text-slate-600">
                  Unlock this to get <span className="text-navy">{top.name}</span>-ready faster.
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffd24d] via-[#ffc42d] to-[#f5b400] px-4 py-1.5 text-xs font-extrabold text-[#171717]">
                {best.cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            {rest.length > 0 && (
              <ul className="mt-3 space-y-2">
                {rest.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{r.category}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-slate-600">{r.message}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#f5b400] transition-colors group-hover:text-[#cc9600]">
                        {r.cta} <ArrowRight className="size-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-1 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-navy"
          >
            <ChevronDown className="size-4" aria-hidden="true" /> Review your answers
          </button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">
              Continue to dashboard <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

// ── Small parts ───────────────────────────────────────────────────────────────

function ScoreRing({ value, tone }: { value: number; tone: 'emerald' | 'amber' | 'orange' }) {
  const stroke =
    tone === 'emerald' ? '#059669' : tone === 'amber' ? '#d97706' : '#f5b400';
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#eef2f7" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - dash)}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-2xl font-black tabular-nums text-navy">{value}%</span>
        <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Overall</span>
      </div>
    </div>
  );
}

function barTone(v: number) {
  if (v >= 70) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (v >= 50) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-[#f5b400]', text: 'text-[#f5b400]' };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const t = barTone(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-navy">{label}</span>
        <span className={cn('font-black tabular-nums', t.text)}>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all', t.bar)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  accent,
  rows,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  accent: 'emerald' | 'orange';
  rows: Array<{ key: string; label: string; score: number }>;
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            'grid size-7 place-items-center rounded-full',
            accent === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange/10 text-[#f5b400]',
          )}
        >
          {icon}
        </span>
        <h2 className="text-sm font-black text-navy">{title}</h2>
      </div>
      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((r) => (
            <ScoreBar key={r.key} label={r.label} value={r.score} />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">{empty}</p>
      )}
    </section>
  );
}
