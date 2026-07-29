'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  getSectionMastery,
  type ApiSectionMasterySummary,
} from '@/lib/api/practice';

/**
 * Dashboard "Skill Mastery" card — accuracy across ALL sections with a section
 * filter, so every MCQ section is visible (fixing the "only Numerical Ability
 * visible" bug where a flat top-N slice hid the rest). Data + all business values
 * come from GET /practice/section-mastery (server-computed, zero-filled); this
 * component only renders and filters (FRONTEND_STANDARDS §3).
 *
 * (Export name kept as `AdaptiveSkillProfile` for the dashboard mount; the card is
 * now accuracy-based, not the adaptive/IRT estimate.)
 */
type Filter = 'all' | string;

export function AdaptiveSkillProfile() {
  const [data, setData] = useState<ApiSectionMasterySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;
    getSectionMastery()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        /* fetch failed — render nothing, never block the dashboard */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        <Loader2 className="size-4 animate-spin text-orange" />
        Loading your skill mastery…
      </div>
    );
  }

  if (!data) return null;

  const { sections, overallAccuracyPct, totalAttempted } = data;
  const activeSection = active === 'all' ? null : sections.find((s) => s.sectionSlug === active) ?? null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Skill Mastery</p>
            <p className="text-base font-bold text-navy">Accuracy by section</p>
          </div>
        </div>
        <Link href="/practice" className="mt-1 shrink-0 text-[11px] font-semibold text-orange hover:underline">
          Practice →
        </Link>
      </div>

      {totalAttempted === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-navy">Build your skill mastery</p>
          <p className="mt-1 text-xs text-slate-500">
            Practise across sections and your accuracy for each will show up here.
          </p>
          <Link href="/practice" className="mt-3 inline-block text-xs font-semibold text-orange hover:underline">
            Start practising →
          </Link>
        </div>
      ) : (
        <>
          {/* Overall accuracy */}
          <div className="mb-4 flex items-end justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Overall accuracy</p>
              <p className="mt-0.5 text-[26px] font-extrabold leading-none text-navy">{overallAccuracyPct}%</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {totalAttempted} question{totalAttempted !== 1 ? 's' : ''} attempted
            </span>
          </div>

          {/* Section filter chips (§4.12) */}
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip label="All" selected={active === 'all'} onClick={() => setActive('all')} />
            {sections.map((s) => (
              <FilterChip
                key={s.sectionSlug}
                label={s.sectionLabel}
                selected={active === s.sectionSlug}
                onClick={() => setActive(s.sectionSlug)}
              />
            ))}
          </div>

          {/* Bars: all → per-section; a section → its topics */}
          {active === 'all' ? (
            <div className="space-y-3.5">
              {sections.map((s) => (
                <MasteryRow key={s.sectionSlug} label={s.sectionLabel} attempted={s.attempted} pct={s.accuracyPct} />
              ))}
            </div>
          ) : activeSection && activeSection.attempted && activeSection.topics.length > 0 ? (
            <div className="space-y-3.5">
              {activeSection.topics.map((t) => (
                <MasteryRow key={t.topicSlug} label={t.topicName} attempted pct={t.accuracyPct} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-navy">Not practised yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Practise {activeSection?.sectionLabel ?? 'this section'} to see your accuracy here.
              </p>
              <Link href="/practice" className="mt-3 inline-block text-xs font-semibold text-orange hover:underline">
                Start practising →
              </Link>
            </div>
          )}

          <p className="mt-4 text-[10px] font-medium text-slate-400">
            Accuracy (correct ÷ attempted) across your practice. Sections you haven&apos;t practised show as Not attempted.
          </p>
        </>
      )}
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        selected ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {label}
    </button>
  );
}

function MasteryRow({ label, attempted, pct }: { label: string; attempted: boolean; pct: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-navy">{label}</span>
        {attempted ? (
          <span className="shrink-0 text-xs font-extrabold tabular-nums text-navy">{pct}%</span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            Not attempted
          </span>
        )}
      </div>
      <ProgressBar value={attempted ? pct : 0} label={`${label} accuracy`} />
    </div>
  );
}
