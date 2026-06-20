'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Code2, Compass, FileCheck2, Target, type LucideIcon } from 'lucide-react';
import { getReadiness, type Readiness } from '@/lib/api/readiness';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;
function tone(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}
function useCountUp(target: number, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / ms, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

/* Big hero gauge with gradient stroke + glow. */
function HeroGauge({ score, size = 150 }: { score: number; size?: number }) {
  const r = size / 2 - 13;
  const circ = 2 * Math.PI * r;
  const c = tone(score);
  const n = useCountUp(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="rdyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.7" />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={12} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#rdyGrad)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.1, ease: EASE }}
          style={{ filter: `drop-shadow(0 0 7px ${c}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tabular-nums text-navy">{n}</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">readiness</span>
      </div>
    </div>
  );
}

/* Small labelled ring for a component score. */
function MiniRing({ label, pct, icon: Icon, active }: { label: string; pct: number; icon: LucideIcon; active: boolean }) {
  const size = 64;
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const c = active ? tone(pct) : '#cbd5e1';
  return (
    <div className={cn('flex flex-col items-center gap-1.5', !active && 'opacity-50')}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={6} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <Icon className="size-4" style={{ color: c }} />
        </span>
      </div>
      <span className="text-xs font-extrabold tabular-nums" style={{ color: active ? '#0b1220' : '#94a3b8' }}>{pct}%</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}

const COMP_ICON: Record<string, LucideIcon> = {
  Practice: ClipboardList,
  'Mock tests': FileCheck2,
  Coding: Code2,
  Coverage: Compass,
};

export function ReadinessPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Readiness | null>(null);
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [err, setErr] = useState(false);

  useEffect(() => {
    getReadiness().then(setData).catch(() => setErr(true));
    listCompanies()
      .then((cs: ApiCompany[]) => setLogos(Object.fromEntries(cs.map((c) => [c.slug, c.logoUrl]))))
      .catch(() => {});
  }, []);

  if (err) return null;
  if (!data) {
    return <div className="grid h-52 animate-pulse place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm" />;
  }

  const c = tone(data.overall.score);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* hero band */}
      <div className="relative overflow-hidden border-b border-slate-100 p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full opacity-[0.10] blur-2xl" style={{ background: c }} />
        <div className="relative flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          <Target className="size-4 text-orange" /> Placement readiness
        </div>
        <div className="relative mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center">
            <HeroGauge score={data.overall.score} />
            <span className="mt-2 rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: `${c}1a`, color: c }}>
              {data.overall.level}
            </span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            {data.overall.components.map((comp) => (
              <MiniRing key={comp.label} label={comp.label} pct={comp.score} active={comp.active} icon={COMP_ICON[comp.label] ?? Compass} />
            ))}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="space-y-6 p-6">
          {/* company readiness — donut cards */}
          {data.companies.length ? (
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Company readiness</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.companies.slice(0, 8).map((co) => (
                  <CompanyRing key={co.slug} name={co.name} logo={logos[co.slug] ?? null} pct={co.readiness} level={co.level} sub={`${co.questionsAttempted}q${co.codingTotal ? ` · ${co.codingSolved}/${co.codingTotal}` : ''}`} />
                ))}
              </div>
            </div>
          ) : null}

          {/* topic mastery — heatmap chips */}
          {data.topics.length ? (
            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Topic mastery</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.topics.slice(0, 10).map((t, i) => (
                  <motion.div
                    key={t.slug}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: tone(t.accuracy) }} />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-navy">{t.topic}</span>
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:block">
                      <motion.div className="h-full rounded-full" style={{ background: tone(t.accuracy) }} initial={{ width: 0 }} animate={{ width: `${t.accuracy}%` }} transition={{ duration: 0.7 }} />
                    </div>
                    <span className="w-10 text-right text-xs font-extrabold tabular-nums" style={{ color: tone(t.accuracy) }}>{t.accuracy}%</span>
                    <span className="w-6 text-right text-[10px] font-medium text-slate-400">{t.attempts}q</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}

          {data.companies.length === 0 && data.topics.length === 0 ? (
            <p className="text-xs text-slate-500">
              Practice questions, take mock quizzes and assessments to build your readiness.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CompanyRing({ name, logo, pct, level, sub }: { name: string; logo: string | null; pct: number; level: string; sub: string }) {
  const size = 76;
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const c = tone(pct);
  const n = useCountUp(pct);
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 p-3 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={7} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={7} strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - (pct / 100) * circ }} transition={{ duration: 0.9, ease: EASE }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} className="max-h-7 max-w-9 object-contain" />
          ) : (
            <span className="text-sm font-black tabular-nums text-navy">{n}</span>
          )}
        </span>
      </div>
      <span className="mt-2 truncate text-xs font-bold text-navy" title={name}>{name}</span>
      <span className="text-[11px] font-extrabold" style={{ color: c }}>{pct}% · {level}</span>
      <span className="mt-0.5 text-[10px] text-slate-400">{sub}</span>
    </div>
  );
}
