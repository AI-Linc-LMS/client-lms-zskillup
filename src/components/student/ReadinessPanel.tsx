'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Target } from 'lucide-react';
import { getReadiness, type Readiness } from '@/lib/api/readiness';
import { cn } from '@/lib/utils';

function toneFor(pct: number): string {
  if (pct >= 80) return '#10b981';
  if (pct >= 60) return '#6366f1';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

function Gauge({ score, size = 132 }: { score: number; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const color = toneFor(score);
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / 1100, 1);
      setN(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={10} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tabular-nums text-navy">{n}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">readiness</span>
      </div>
    </div>
  );
}

function Bar({ label, pct, sub, dim }: { label: string; pct: number; sub?: string; dim?: boolean }) {
  return (
    <div className={dim ? 'opacity-40' : ''}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-navy">{label}</span>
        <span className="font-bold tabular-nums" style={{ color: toneFor(pct) }}>
          {pct}%{sub ? <span className="ml-1.5 font-medium text-slate-400">{sub}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{ background: toneFor(pct) }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

/** Unified readiness panel — overall gauge + components + company + topic readiness. */
export function ReadinessPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Readiness | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    getReadiness()
      .then(setData)
      .catch(() => setErr(true));
  }, []);

  if (err) return null;
  if (!data) {
    return (
      <div className="grid h-48 place-items-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
        <Target className="size-4 text-orange" /> Placement readiness
      </h3>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center">
          <Gauge score={data.overall.score} />
          <span
            className="mt-2 rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: `${toneFor(data.overall.score)}1a`, color: toneFor(data.overall.score) }}
          >
            {data.overall.level}
          </span>
        </div>
        <div className="w-full flex-1 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">How it&apos;s built</p>
          {data.overall.components.map((c) => (
            <Bar key={c.label} label={c.label} pct={c.score} dim={!c.active} sub={c.active ? undefined : '(no data yet)'} />
          ))}
        </div>
      </div>

      {!compact && data.companies.length ? (
        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Company readiness
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.companies.slice(0, 6).map((c) => (
              <Bar
                key={c.slug}
                label={c.name}
                pct={c.readiness}
                sub={`${c.questionsAttempted}q${c.codingTotal ? ` · ${c.codingSolved}/${c.codingTotal} code` : ''}`}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!compact && data.topics.length ? (
        <div className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Topic mastery
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {data.topics.slice(0, 8).map((t) => (
              <Bar key={t.slug} label={t.topic} pct={t.accuracy} sub={`${t.attempts}q`} />
            ))}
          </div>
        </div>
      ) : null}

      {data.companies.length === 0 && data.topics.length === 0 ? (
        <p className={cn('mt-4 text-xs text-slate-500')}>
          Practice questions, take mock quizzes and assessments to build your readiness score.
        </p>
      ) : null}
    </div>
  );
}
