'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { SkillRadar } from '@/components/adaptive/ResultsVisuals';
import { SkillMasteryHeatmap } from '@/components/adaptive/SkillMasteryHeatmap';
import type { SkillMastery } from '@/lib/api/adaptive';
import { getSectionMastery, type ApiSectionMasterySummary } from '@/lib/api/practice';

/**
 * Skill-mastery view on the practice results page. Defaults to THIS session's skills
 * (unchanged), but adds a section filter so a student can see their accuracy across
 * EVERY practised section — not just the one they happened to drill (fixing the "only
 * Numerical Ability is visible" report). Cross-section data + all values come from
 * GET /practice/section-mastery (server-computed); this only renders and filters.
 */
function bandFor(pct: number): SkillMastery['band'] {
  if (pct >= 80) return 'mastered';
  if (pct >= 60) return 'proficient';
  if (pct >= 40) return 'developing';
  return 'emerging';
}

/** Map a section's topic accuracy → the radar/heatmap SkillMastery shape. */
function topicsToSkills(topics: { topicName: string; accuracyPct: number }[]): SkillMastery[] {
  return topics.map((t) => ({
    skill: t.topicName,
    masteryPct: t.accuracyPct,
    theta: 0,
    se: 0,
    deltaPct: null,
    band: bandFor(t.accuracyPct),
  }));
}

export function SkillMasterySection({ sessionSkills }: { sessionSkills: SkillMastery[] }) {
  const [sectionData, setSectionData] = useState<ApiSectionMasterySummary | null>(null);
  const [active, setActive] = useState<'session' | string>('session'); // 'session' | sectionSlug

  useEffect(() => {
    let cancelled = false;
    getSectionMastery()
      .then((d) => {
        if (!cancelled) setSectionData(d);
      })
      .catch(() => {
        /* cross-section view unavailable — fall back to just this session */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only offer sections the student has actually practised (others have no radar).
  const filterable = (sectionData?.sections ?? []).filter((s) => s.attempted && s.topics.length > 0);

  const skills: SkillMastery[] =
    active === 'session'
      ? sessionSkills
      : topicsToSkills(sectionData?.sections.find((s) => s.sectionSlug === active)?.topics ?? []);

  return (
    <div className="space-y-4">
      {/* Section filter — only when there's cross-section data to switch between. */}
      {filterable.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Chip label="This session" selected={active === 'session'} onClick={() => setActive('session')} />
          {filterable.map((s) => (
            <Chip
              key={s.sectionSlug}
              label={s.sectionLabel}
              selected={active === s.sectionSlug}
              onClick={() => setActive(s.sectionSlug)}
            />
          ))}
        </div>
      )}

      {skills.length >= 3 ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Skill radar
            </p>
            <SkillRadar skills={skills} size={380} />
          </div>
          <SkillMasteryHeatmap skillMastery={skills} />
        </>
      ) : skills.length > 0 ? (
        <SkillMasteryHeatmap skillMastery={skills} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
          Not practised yet — practise this section to see your skill breakdown here.
        </div>
      )}
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
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
