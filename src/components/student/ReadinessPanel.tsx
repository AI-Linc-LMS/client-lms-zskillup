'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Code2, Compass, FileCheck2, Target, type LucideIcon } from 'lucide-react';
import { getReadiness, type Readiness } from '@/lib/api/readiness';
import { listCompanies, type ApiCompany } from '@/lib/api/catalog';
import { cn } from '@/lib/utils';

const EASE = [0.16, 1, 0.3, 1] as const;
function tone(pct: number): string {
  if (pct >= 80) return '#34d399';
  if (pct >= 60) return '#818cf8';
  if (pct >= 40) return '#fbbf24';
  return '#f87171';
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

/* Big hero gauge with gradient stroke + glow — tuned for a dark navy hero. */
function HeroGauge({ score, size = 156 }: { score: number; size?: number }) {
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const c = tone(score);
  const n = useCountUp(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id="rdyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.6" />
            <stop offset="100%" stopColor={c} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={12} />
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
          style={{ filter: `drop-shadow(0 0 8px ${c}77)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[44px] font-black leading-none tabular-nums text-white">{n}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">readiness</span>
      </div>
    </div>
  );
}

/* Small labelled ring for a component score — dark-hero variant. */
function MiniRing({ label, pct, icon: Icon, active }: { label: string; pct: number; icon: LucideIcon; active: boolean }) {
  const size = 66;
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const c = active ? tone(pct) : 'rgba(255,255,255,0.25)';
  return (
    <div className={cn('flex flex-col items-center gap-1.5', !active && 'opacity-60')}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={6} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <Icon className="size-4" style={{ color: active ? c : 'rgba(255,255,255,0.4)' }} />
        </span>
      </div>
      <span className="text-xs font-extrabold tabular-nums" style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.45)' }}>{pct}%</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</span>
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
    return <div className="grid h-52 animate-pulse place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm" />;
  }

  const c = tone(data.overall.score);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Navy premium hero band ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: c }} />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#2563eb]/20 blur-3xl" />
        <div className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">
          <Target className="size-4 text-[#ffb877]" /> Placement readiness
        </div>
        <div className="relative mt-5 flex flex-col items-center gap-7 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center">
            <HeroGauge score={data.overall.score} />
            <span className="mt-3 rounded-full px-3 py-1 text-xs font-extrabold ring-1" style={{ background: `${c}22`, color: c, boxShadow: `inset 0 0 0 1px ${c}33` }}>
              {data.overall.level}
            </span>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-4">
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
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Company readiness</p>
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
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Topic mastery</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.topics.slice(0, 10).map((t, i) => (
                  <motion.div
                    key={t.slug}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-slate-300"
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: toneSolid(t.accuracy) }} />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-navy">{t.topic}</span>
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-slate-100 sm:block">
                      <motion.div className="h-full rounded-full" style={{ background: toneSolid(t.accuracy) }} initial={{ width: 0 }} animate={{ width: `${t.accuracy}%` }} transition={{ duration: 0.7 }} />
                    </div>
                    <span className="w-10 text-right text-xs font-extrabold tabular-nums" style={{ color: toneSolid(t.accuracy) }}>{t.accuracy}%</span>
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

/* Solid (non-dark) tone for the light section below the hero. */
function toneSolid(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

function CompanyRing({ name, logo, pct, level, sub }: { name: string; logo: string | null; pct: number; level: string; sub: string }) {
  const size = 76;
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const c = toneSolid(pct);
  const n = useCountUp(pct);
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center transition-colors hover:border-slate-300">
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
