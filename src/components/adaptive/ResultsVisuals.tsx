'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { SkillMastery } from '@/lib/api/adaptive';

const AI_GRAD = 'linear-gradient(135deg,#6366f1 0%,#a855f7 55%,#ec4899 100%)';

/* ── Word-by-word AI text reveal (typewriter) ─────────────────────────────── */
export function Typewriter({
  text,
  className,
  wordMs = 45,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  wordMs?: number;
  startDelay?: number;
}) {
  const words = text ? text.split(/(\s+)/) : [];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    if (!text) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < words.length) timer = setTimeout(tick, wordMs);
    };
    const start = setTimeout(tick, startDelay);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [text, wordMs, startDelay]);

  const done = shown >= words.length;
  return (
    <span className={className}>
      {words.slice(0, shown).join('')}
      {!done ? (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[1px] rounded bg-current align-middle"
        />
      ) : null}
    </span>
  );
}

/* ── "Magic" AI loader — gradient orb + cycling status + shimmer ───────────── */
const LOADER_MESSAGES = [
  'Reading your accuracy curve…',
  'Annotating each answer…',
  'Clustering wrong answers…',
  'Plotting your path forward…',
];
export function MagicLoader({ messages = LOADER_MESSAGES }: { messages?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % messages.length), 1800);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
      {/* drifting gradient wash */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ background: AI_GRAD, backgroundSize: '200% 200%' }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <div className="relative flex items-center gap-3">
        {/* orb */}
        <span className="relative inline-flex size-10 shrink-0">
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: AI_GRAD }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="relative grid size-full place-items-center rounded-full" style={{ background: AI_GRAD }}>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="size-5 text-white" />
            </motion.span>
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">Composing your results</p>
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-slate-500"
          >
            {messages[i]}
          </motion.p>
        </div>
      </div>
      {/* shimmer rail */}
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{ background: AI_GRAD }}
          animate={{ x: ['-100%', '320%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

/* ── Animated accuracy donut ───────────────────────────────────────────────── */
export function AccuracyDonut({ accuracy, size = 132 }: { accuracy: number; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const color = accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#6366f1' : accuracy >= 40 ? '#f59e0b' : '#ef4444';
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / 1100, 1);
      setN(Math.round(accuracy * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [accuracy]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={10} />
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
          animate={{ strokeDashoffset: circ - (accuracy / 100) * circ }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-white">{n}%</span>
        <span className="text-[10px] text-white/50">accuracy</span>
      </div>
    </div>
  );
}

/* ── Skill mastery RADAR (spider) chart ────────────────────────────────────── */
const prettySkill = (s: string) =>
  (s || '').replace(/[-_]/g, ' ').replace(/section \d+\s*/i, '').replace(/\b\w/g, (m) => m.toUpperCase()).trim();

export function SkillRadar({ skills: allSkills, size = 360 }: { skills: SkillMastery[]; size?: number }) {
  // A radar is only legible up to ~8 spokes — show the strongest skills here;
  // the full list lives in the mastery bars below it.
  const skills = [...allSkills].sort((a, b) => b.masteryPct - a.masteryPct).slice(0, 8);
  const n = skills.length;
  if (n < 3) return null;
  // Generous side/vertical padding so FULL skill names render untruncated.
  const padX = 116;
  const padY = 48;
  const vbW = size + padX * 2;
  const vbH = size + padY * 2;
  const cx = vbW / 2;
  const cy = vbH / 2;
  const R = size / 2 - 6;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  });
  const rings = [0.25, 0.5, 0.75, 1];
  const polygon = (radius: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = pt(i, radius);
      return `${p.x},${p.y}`;
    }).join(' ');
  const dataPoints = skills.map((s, i) => pt(i, R * (s.masteryPct / 100)));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="mx-auto w-full max-w-[600px] overflow-visible">
      <defs>
        <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* grid rings */}
      {rings.map((rr) => (
        <polygon key={rr} points={polygon(R * rr)} fill="none" stroke="#e2e8f0" strokeWidth={1} />
      ))}
      {/* axes */}
      {skills.map((s, i) => {
        const p = pt(i, R);
        return <line key={s.skill} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={1} />;
      })}
      {/* data polygon */}
      <motion.polygon
        points={dataPolygon}
        fill="url(#radarFill)"
        stroke="#6366f1"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* vertices */}
      {dataPoints.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={5}
          fill="#fff"
          stroke="#6366f1"
          strokeWidth={2.5}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 300 }}
        />
      ))}
      {/* labels - FULL skill name on top, % beneath; the side padding gives
          room so long names ("Boats & Streams") are never truncated. */}
      {skills.map((s, i) => {
        const p = pt(i, R + 20);
        const anchor = Math.abs(p.x - cx) < 10 ? 'middle' : p.x > cx ? 'start' : 'end';
        const name = prettySkill(s.skill);
        return (
          <text
            key={s.skill}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-slate-600 text-[11px] font-semibold"
          >
            <tspan x={p.x} dy="-0.35em">{name}</tspan>
            <tspan x={p.x} dy="1.15em" className="fill-navy text-[12px] font-extrabold">
              {s.masteryPct}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
