'use client';

import { cn } from '@/lib/utils';
import type { SkillMastery } from '@/lib/api/adaptive';

const BAND_CONFIG = {
  emerging: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-400', label: 'Emerging' },
  developing: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400', label: 'Developing' },
  proficient: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500', label: 'Proficient' },
  mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'Mastered' },
} as const;

interface SkillMasteryHeatmapProps {
  skillMastery: SkillMastery[];
}

export function SkillMasteryHeatmap({ skillMastery }: SkillMasteryHeatmapProps) {
  if (skillMastery.length === 0) {
    return (
      <div className="rounded-xl border bg-slate-50 p-6 text-center text-sm text-muted-foreground">
        No skill data yet — complete the quiz to see your mastery profile.
      </div>
    );
  }

  const sorted = [...skillMastery].sort((a, b) => b.masteryPct - a.masteryPct);

  return (
    <div className="space-y-3">
      {sorted.map((s) => {
        const cfg = BAND_CONFIG[s.band];
        return (
          <div
            key={s.skill}
            className={cn('rounded-xl border p-4', cfg.bg, cfg.border)}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold text-navy text-sm">{s.skill}</span>
                {s.deltaPct !== null && (
                  <span
                    className={cn(
                      'ml-2 text-xs font-medium',
                      s.deltaPct >= 0 ? 'text-emerald-600' : 'text-red-500',
                    )}
                  >
                    {s.deltaPct >= 0 ? '+' : ''}{s.deltaPct}% vs prior
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
                  {cfg.label}
                </span>
                <span className={cn('text-sm font-bold', cfg.text)}>{s.masteryPct}%</span>
              </div>
            </div>
            {/* Mastery bar */}
            <div className="h-2 rounded-full bg-white/60">
              <div
                className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
                style={{ width: `${s.masteryPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
              <span>θ = {s.theta.toFixed(2)}</span>
              <span>SE = ±{s.se.toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
