'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Brain, Loader2, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAdaptiveSessions, getAdaptiveResults, type SkillMastery } from '@/lib/api/adaptive';
import { AnimatedNumber } from '@/components/motion/primitives';

interface SkillProfileState {
  loading: boolean;
  skills: SkillMastery[];
  sessionId: string | null;
  sessionCount: number;
  topSkill: string | null;
  weakestSkill: string | null;
}

const BAND_LABEL = {
  emerging: 'Emerging',
  developing: 'Developing',
  proficient: 'Proficient',
  mastered: 'Mastered',
} as const;

const BAND_BADGE = {
  emerging: 'bg-red-50 text-red-700 ring-red-200',
  developing: 'bg-amber-50 text-amber-700 ring-amber-200',
  proficient: 'bg-blue-50 text-blue-700 ring-blue-200',
  mastered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
} as const;

/** Two-stop gradients per band for the animated mastery fills. */
const BAND_GRADIENT = {
  emerging: 'linear-gradient(90deg, #fb7185, #ef4444)',
  developing: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
  proficient: 'linear-gradient(90deg, #60a5fa, #2563eb)',
  mastered: 'linear-gradient(90deg, #34d399, #059669)',
} as const;

const BAND_GLOW = {
  emerging: '#ef4444',
  developing: '#f59e0b',
  proficient: '#2563eb',
  mastered: '#059669',
} as const;

/**
 * Personalized skill profile card for the student dashboard.
 * Loads the most recent completed adaptive session and surfaces:
 * - Per-skill mastery bars
 * - Top (strongest) and weakest skill callout
 * - CTA to retake or view full report
 */
export function AdaptiveSkillProfile() {
  const [state, setState] = useState<SkillProfileState>({
    loading: true,
    skills: [],
    sessionId: null,
    sessionCount: 0,
    topSkill: null,
    weakestSkill: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessions = await listAdaptiveSessions();
        const completed = sessions.filter((s) => s.status === 'completed');
        if (completed.length === 0) {
          if (!cancelled) setState((s) => ({ ...s, loading: false, sessionCount: 0 }));
          return;
        }
        // Most recent first
        const latest = completed[0];
        const results = await getAdaptiveResults(latest.sessionId);
        if (cancelled) return;

        const skills = results.skillMastery;
        const sorted = [...skills].sort((a, b) => b.masteryPct - a.masteryPct);
        setState({
          loading: false,
          skills: sorted,
          sessionId: latest.sessionId,
          sessionCount: completed.length,
          topSkill: sorted[0]?.skill ?? null,
          weakestSkill: sorted[sorted.length - 1]?.skill ?? null,
        });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 text-sm text-slate-400 shadow-sm">
        <Loader2 className="size-4 animate-spin text-orange" />
        Loading your skill profile…
      </div>
    );
  }

  if (state.sessionCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="group relative overflow-hidden rounded-3xl border border-orange/20 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        {/* warm gradient wash + glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange/[0.06] via-transparent to-amber-100/30" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-orange/20 opacity-60 blur-2xl transition-opacity group-hover:opacity-90"
        />
        <div className="relative flex items-start gap-3.5">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f7a14e, #f37021)' }}
          >
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Discover your skill level</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Take an AI adaptive quiz to get a personalised skill profile and study plan.
            </p>
            <Link
              href="/mock-tests"
              className="group/cta mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#f7a14e] to-[#f37021] px-3.5 py-2 text-xs font-bold text-white shadow-[0_10px_24px_-12px_rgba(243,112,33,0.9)] transition-transform active:scale-[0.98]"
            >
              Take your first adaptive test
              <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const overallMastery = state.skills.length
    ? Math.round(state.skills.reduce((sum, s) => sum + s.masteryPct, 0) / state.skills.length)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      {/* layered depth: gradient wash + colored glow blob */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-50/80 via-transparent to-orange/[0.04]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-orange/15 opacity-50 blur-3xl transition-opacity group-hover:opacity-80"
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, #f7a14e, #f37021)' }}
            >
              <Brain className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Adaptive
              </p>
              <p className="text-sm font-bold text-navy">Your Skill Profile</p>
            </div>
          </div>
          <Link
            href={`/dashboard/quiz/adaptive/results?session=${state.sessionId}`}
            className="group/link mt-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-orange transition-colors hover:text-[#d85f12]"
          >
            Full report
            <ArrowRight className="size-3 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>

        {/* Overall mastery */}
        <div className="mb-5 flex items-end justify-between rounded-2xl border border-slate-200/70 bg-slate-50/60 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Overall mastery
            </p>
            <p className="mt-0.5 text-3xl font-black leading-none tracking-tight text-navy">
              <AnimatedNumber value={overallMastery} format={(n) => `${n}%`} />
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
            {state.skills.length} skill{state.skills.length !== 1 ? 's' : ''} tracked
          </span>
        </div>

        {/* Skills bars */}
        <div className="mb-5 space-y-3.5">
          {state.skills.slice(0, 5).map((s, i) => (
            <div key={s.skill}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-navy">{s.skill}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                      BAND_BADGE[s.band],
                    )}
                  >
                    {BAND_LABEL[s.band]}
                  </span>
                  <span className="text-xs font-extrabold text-navy tabular-nums">
                    <AnimatedNumber value={s.masteryPct} format={(n) => `${n}%`} />
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: BAND_GRADIENT[s.band],
                    boxShadow: `0 0 10px -2px ${BAND_GLOW[s.band]}66`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${s.masteryPct}%` }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Callout row */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          {state.topSkill && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-3 transition-transform hover:-translate-y-0.5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-4 -top-4 size-14 rounded-full bg-emerald-400/25 blur-xl"
              />
              <div className="relative">
                <div className="mb-1 flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-emerald-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                    Strongest
                  </p>
                </div>
                <p className="truncate text-sm font-bold text-emerald-900">{state.topSkill}</p>
              </div>
            </div>
          )}
          {state.weakestSkill && state.weakestSkill !== state.topSkill && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-amber-100/40 p-3 transition-transform hover:-translate-y-0.5">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-4 -top-4 size-14 rounded-full bg-amber-400/25 blur-xl"
              />
              <div className="relative">
                <div className="mb-1 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700">
                    Needs work
                  </p>
                </div>
                <p className="truncate text-sm font-bold text-amber-900">{state.weakestSkill}</p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] font-medium text-slate-400">
          Based on {state.sessionCount} adaptive session{state.sessionCount !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.div>
  );
}
