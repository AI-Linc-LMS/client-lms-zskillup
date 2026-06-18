'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Brain, Loader2, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listAdaptiveSessions, getAdaptiveResults, type SkillMastery } from '@/lib/api/adaptive';

interface SkillProfileState {
  loading: boolean;
  skills: SkillMastery[];
  sessionId: string | null;
  sessionCount: number;
  topSkill: string | null;
  weakestSkill: string | null;
}

const BAND_COLOR = {
  emerging: 'bg-red-100 text-red-700 border-red-200',
  developing: 'bg-amber-100 text-amber-700 border-amber-200',
  proficient: 'bg-blue-100 text-blue-700 border-blue-200',
  mastered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
} as const;

const BAR_COLOR = {
  emerging: 'bg-red-400',
  developing: 'bg-amber-400',
  proficient: 'bg-blue-500',
  mastered: 'bg-emerald-500',
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
      <div className="flex items-center gap-3 rounded-xl border bg-white p-5 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin text-orange" />
        Loading your skill profile…
      </div>
    );
  }

  if (state.sessionCount === 0) {
    return (
      <div className="rounded-xl border border-orange/20 bg-orange/5 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-orange/10 text-orange">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="font-semibold text-navy text-sm">Discover your skill level</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Take an AI adaptive quiz to get a personalised skill profile and study plan.
            </p>
            <Link
              href="/mock-tests"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange hover:underline"
            >
              Take your first adaptive test <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-orange" />
          <span className="font-bold text-navy text-sm">Your Skill Profile</span>
        </div>
        <Link
          href={`/dashboard/quiz/adaptive/results?session=${state.sessionId}`}
          className="text-[11px] font-semibold text-orange hover:underline"
        >
          Full report <ArrowRight className="inline size-3" />
        </Link>
      </div>

      {/* Skills bars */}
      <div className="space-y-3 mb-4">
        {state.skills.slice(0, 5).map((s) => (
          <div key={s.skill}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-navy">{s.skill}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                    BAND_COLOR[s.band],
                  )}
                >
                  {s.band.charAt(0).toUpperCase() + s.band.slice(1)}
                </span>
                <span className="text-xs font-bold text-navy">{s.masteryPct}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all duration-700', BAR_COLOR[s.band])}
                style={{ width: `${s.masteryPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Callout row */}
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        {state.topSkill && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="size-3.5 text-emerald-600" />
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Strongest</p>
            </div>
            <p className="text-sm font-bold text-emerald-800">{state.topSkill}</p>
          </div>
        )}
        {state.weakestSkill && state.weakestSkill !== state.topSkill && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="size-3.5 text-amber-600" />
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Needs work</p>
            </div>
            <p className="text-sm font-bold text-amber-800">{state.weakestSkill}</p>
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        Based on {state.sessionCount} adaptive session{state.sessionCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
