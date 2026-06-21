'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Loader2, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp, type LucideIcon } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { cn } from '@/lib/utils';
import { getStudyPlan, getTrends, type StudyAction, type StudyPlan, type Trends } from '@/lib/api/study';

const KIND: Record<StudyAction['kind'], { icon: LucideIcon; bg: string; text: string; ring: string; bar: string; btn: string }> = {
  review: { icon: RefreshCw, bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100', bar: 'from-emerald-500 to-emerald-400', btn: 'from-emerald-500 to-emerald-600' },
  practice: { icon: Target, bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-100', bar: 'from-[#f7a14e] to-[#f37021]', btn: 'from-[#f7a14e] to-[#f37021]' },
  assessment: { icon: ShieldCheck, bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100', bar: 'from-violet-500 to-violet-400', btn: 'from-violet-500 to-violet-600' },
  adaptive: { icon: Brain, bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100', bar: 'from-indigo-500 to-indigo-400', btn: 'from-indigo-500 to-indigo-600' },
};

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    getStudyPlan().then(setPlan).catch(() => setErr(true));
    getTrends(8).then(setTrends).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Study Plan' }]} />

      {/* Hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 text-white shadow-[0_24px_60px_-30px_rgba(11,18,32,0.85)] sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#f37021]/20 blur-3xl" />
        <p className="relative flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb877]">
          <Sparkles className="size-3.5" /> Your study plan
        </p>
        <h1 className="relative mt-1.5 text-2xl font-black tracking-tight sm:text-3xl">Do these next — in order</h1>
        <p className="relative mt-1 max-w-xl text-sm text-white/60">
          One focused queue from your weak topics, reviews and upcoming drives — so you always know the highest-impact next step.
        </p>
        {plan ? (
          <div className="relative mt-5 flex flex-wrap gap-3">
            <span className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-bold backdrop-blur">
              Readiness <span className="ml-1 text-[#ffb877]">{plan.readiness}%</span>
            </span>
            <span className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-bold backdrop-blur">
              Due to review <span className="ml-1 text-emerald-300">{plan.reviewDue}</span>
            </span>
          </div>
        ) : null}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Action queue */}
        <section>
          <h2 className="mb-3 text-lg font-extrabold tracking-tight text-navy sm:text-xl">This week&apos;s plan</h2>
          {err ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Could not load your study plan.</p>
          ) : !plan ? (
            <div className="space-y-3">{[0, 1, 2].map((k) => <div key={k} className="h-24 animate-pulse rounded-3xl bg-slate-100" />)}</div>
          ) : (
            <ol className="space-y-3">
              {plan.actions.map((a, i) => {
                const k = KIND[a.kind];
                const Icon = k.icon;
                return (
                  <motion.li
                    key={`${a.kind}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.2)]"
                  >
                    <span aria-hidden className={cn('pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b', k.bar)} />
                    <div className="flex items-start gap-4 pl-1.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy text-xs font-black text-white">{i + 1}</span>
                      <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset', k.bg, k.text, k.ring)}>
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-navy">{a.title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-slate-500">{a.detail}</p>
                        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">~{a.estMinutes} min</p>
                      </div>
                      <Link
                        href={a.href}
                        className={cn('inline-flex shrink-0 items-center gap-1.5 self-center rounded-full bg-gradient-to-r px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-transform hover:-translate-y-0.5', k.btn)}
                      >
                        {a.cta} <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Trends */}
        <aside>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold tracking-tight text-navy sm:text-xl">
            <TrendingUp className="size-5 text-indigo-500" /> Your trend
          </h2>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(79,70,229,0.25)]">
            {!trends ? (
              <div className="grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-slate-400" /></div>
            ) : (
              <>
                <TrendChart trends={trends} />
                <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-500" /> Practice accuracy</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#f37021]" /> Mock score</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Lightweight dual-line SVG chart (0-100%) over the weekly buckets. */
function TrendChart({ trends }: { trends: Trends }) {
  const w = 320;
  const h = 160;
  const pad = { l: 26, r: 8, t: 10, b: 20 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const pts = trends.weeks;
  const n = pts.length;
  const x = (i: number) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.t + (1 - v / 100) * innerH;

  const path = (key: 'practicePct' | 'mockPct') => {
    let d = '';
    let started = false;
    pts.forEach((p, i) => {
      const v = p[key];
      if (v == null) { started = false; return; }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      started = true;
    });
    return d.trim();
  };

  const hasAny = pts.some((p) => p.practicePct != null || p.mockPct != null);
  if (!hasAny) {
    return <p className="grid h-40 place-items-center text-center text-xs text-slate-400">No activity yet — practice and take a mock to start your trend.</p>;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Weekly practice accuracy and mock score">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={w - pad.r} y1={y(g)} y2={y(g)} stroke="#eef2f7" strokeWidth={1} />
          <text x={pad.l - 6} y={y(g) + 3} textAnchor="end" className="fill-slate-300" style={{ fontSize: 8 }}>{g}</text>
        </g>
      ))}
      {/* mock score */}
      <path d={path('mockPct')} fill="none" stroke="#f37021" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => p.mockPct != null ? <circle key={`m${i}`} cx={x(i)} cy={y(p.mockPct)} r={2.5} fill="#f37021" /> : null)}
      {/* practice accuracy */}
      <path d={path('practicePct')} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => p.practicePct != null ? <circle key={`p${i}`} cx={x(i)} cy={y(p.practicePct)} r={2.5} fill="#6366f1" /> : null)}
      {/* sparse x labels (first / last) */}
      {n > 0 ? <text x={x(0)} y={h - 4} textAnchor="start" className="fill-slate-300" style={{ fontSize: 8 }}>{label(pts[0].weekStart)}</text> : null}
      {n > 1 ? <text x={x(n - 1)} y={h - 4} textAnchor="end" className="fill-slate-300" style={{ fontSize: 8 }}>{label(pts[n - 1].weekStart)}</text> : null}
    </svg>
  );
}

function label(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
