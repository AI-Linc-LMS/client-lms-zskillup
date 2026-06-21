'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Code2, Compass, FileCheck2, Info, Target, X, type LucideIcon } from 'lucide-react';
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
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [err, setErr] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    getReadiness().then(setData).catch(() => setErr(true));
    // Published companies (the live company-hub set) are the source of truth for
    // which readiness cards to show — not whatever slugs the readiness rollup saw.
    listCompanies()
      .then((cs: ApiCompany[]) => setCompanies(cs))
      .catch(() => {});
  }, []);

  if (err) return null;
  if (!data) {
    return <div className="grid h-52 animate-pulse place-items-center rounded-2xl border border-slate-200 bg-white shadow-sm" />;
  }

  const c = tone(data.overall.score);
  const rdyBySlug = new Map(data.companies.map((co) => [co.slug, co]));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Navy premium hero band ──────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1f2d4d] via-[#16223f] to-[#0b1220] p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full opacity-25 blur-3xl" style={{ background: c }} />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/4 size-56 rounded-full bg-[#2563eb]/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            <Target className="size-4 text-[#ffb877]" /> Placement readiness
          </span>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-label="How readiness is calculated"
            aria-expanded={showInfo}
            className="grid size-6 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white/90"
          >
            <Info className="size-4" />
          </button>
        </div>

        {/* How readiness is calculated */}
        {showInfo ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-[11px] leading-relaxed text-white/70 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#ffb877]">How readiness is calculated</p>
              <button type="button" onClick={() => setShowInfo(false)} aria-label="Close" className="text-white/40 hover:text-white/80"><X className="size-3.5" /></button>
            </div>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <li className="flex gap-2"><ClipboardList className="mt-0.5 size-3.5 shrink-0 text-[#ffb877]" /><span><b className="text-white">Practice · 35%</b><br />Accuracy on practice questions — correct ÷ attempted.</span></li>
              <li className="flex gap-2"><FileCheck2 className="mt-0.5 size-3.5 shrink-0 text-[#ffb877]" /><span><b className="text-white">Mock tests · 30%</b><br />Your average score across finished mock quizzes &amp; assessments (mean of score ÷ total per attempt).</span></li>
              <li className="flex gap-2"><Code2 className="mt-0.5 size-3.5 shrink-0 text-[#ffb877]" /><span><b className="text-white">Coding · 20%</b><br />Solve rate — distinct problems solved ÷ distinct problems attempted.</span></li>
              <li className="flex gap-2"><Compass className="mt-0.5 size-3.5 shrink-0 text-[#ffb877]" /><span><b className="text-white">Coverage · 15%</b><br />Breadth — distinct topics you&apos;ve practised ÷ all topics on the platform.</span></li>
            </ul>
            <p className="mt-3 border-t border-white/10 pt-3">
              <b className="text-white">Overall readiness</b> is a weighted blend of the four
              (Practice&nbsp;35% · Mock&nbsp;30% · Coding&nbsp;20% · Coverage&nbsp;15%), counting only the parts you have
              data for — Coverage always counts. So your weakest area drags the score down the most by its weight.
            </p>
            <p className="mt-2">
              Bands: <b className="text-rose-300">Needs work</b> &lt;40 · <b className="text-amber-300">Developing</b> 40–59 ·{' '}
              <b className="text-indigo-300">Proficient</b> 60–79 · <b className="text-emerald-300">Strong</b> 80+.
            </p>
          </motion.div>
        ) : null}
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
          {/* company readiness — one card per PUBLISHED company (logo + score) */}
          {companies.length ? (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Company readiness</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {companies.map((co) => {
                  const r = rdyBySlug.get(co.slug);
                  return (
                    <CompanyRing
                      key={co.slug}
                      name={co.name}
                      logo={co.logoUrl}
                      pct={r?.readiness ?? 0}
                      level={r?.level ?? 'Not started'}
                      sub={
                        r
                          ? `${r.questionsAttempted}q${r.codingTotal ? ` · ${r.codingSolved}/${r.codingTotal} code` : ''}`
                          : 'Start practising'
                      }
                    />
                  );
                })}
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

          {companies.length === 0 && data.topics.length === 0 ? (
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
  const c = toneSolid(pct);
  const n = useCountUp(pct);
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs font-black text-slate-500">{name.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-navy" title={name}>{name}</p>
          <p className="text-[11px] font-bold" style={{ color: c }}>{level}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-2xl font-black leading-none tabular-nums" style={{ color: c }}>{n}<span className="text-sm">%</span></span>
        <span className="text-[10px] font-medium text-slate-400">{sub}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div className="h-full rounded-full" style={{ background: c }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: EASE }} />
      </div>
    </div>
  );
}
