'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Code2, Loader2, MessageSquare, Target } from 'lucide-react';
import { getTpoAnalytics, getTpoCodingAnalytics } from '@/lib/api/tpo';
import type { TpoCodingAnalytics, TpoDashboard } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { ConsoleHero } from '@/components/layout/ConsoleHero';

const DIFF = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
] as const;

function GapBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-sm text-navy">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}

export default function SkillGapAnalyticsPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [coding, setCoding] = useState<TpoCodingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getTpoAnalytics(cohortId || undefined), getTpoCodingAnalytics(cohortId || undefined)])
      .then(([d, c]) => {
        setData(d);
        setCoding(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load skill gaps'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  const codingWeakCompanies = useMemo(
    () => [...(coding?.companies ?? [])].sort((a, b) => a.solveRate - b.solveRate).slice(0, 5),
    [coding],
  );
  const cohortLabel = cohortId ? cohorts.find((c) => c.id === cohortId)?.name ?? 'Batch' : 'All batches';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-7 animate-spin text-slate-500" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  }

  const aptitudeGaps = data?.skillGaps ?? [];

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Target}
        eyebrow="Placement Office"
        title="Skill Gap Analytics"
        description="The weakest aptitude, coding, and interview areas across your cohort — where clinics move the needle."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel}
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Aptitude */}
        <BentoCard
          title="Aptitude Skill Gaps"
          subtitle="Weakest topics by accuracy (min 10 attempts)."
          source="Topic-wise question performance"
        >
          <div className="flex items-center gap-1.5 pb-3 text-xs font-semibold text-[#1a1a1a]">
            <Target className="size-4" /> Aptitude
          </div>
          {aptitudeGaps.length === 0 ? (
            <p className="text-sm text-slate-500">Not enough practice data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {aptitudeGaps.map((g) => (
                <GapBar key={g.slug} label={g.topic} value={g.accuracy} />
              ))}
            </div>
          )}
        </BentoCard>

        {/* Coding */}
        <BentoCard
          title="Coding Skill Gaps"
          subtitle="Weakest difficulty tiers & company patterns by solve rate."
          source="Coding submissions"
        >
          <div className="flex items-center gap-1.5 pb-3 text-xs font-semibold text-[#1a1a1a]">
            <Code2 className="size-4" /> Coding
          </div>
          {(coding?.totalAttempted ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No coding activity yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {DIFF.map((d) => {
                  const b = coding!.difficulty[d.key];
                  const rate = b.attempted > 0 ? Math.round((b.solved / b.attempted) * 100) : 0;
                  return <GapBar key={d.key} label={`${d.label} problems`} value={rate} />;
                })}
              </div>
              {codingWeakCompanies.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Weakest company patterns
                  </p>
                  <div className="space-y-2.5">
                    {codingWeakCompanies.map((c) => (
                      <GapBar key={c.slug} label={c.name} value={c.solveRate} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </BentoCard>
      </div>

      {/* Campus weak areas summary */}
      <BentoCard
        title="Campus Weak Areas"
        subtitle="The lowest-accuracy areas across your cohort - prioritize these for clinics."
        source="Aggregated aptitude + coding performance"
      >
        {aptitudeGaps.length === 0 && (coding?.totalAttempted ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Weak-area ranking appears as students practise.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {aptitudeGaps.slice(0, 5).map((g) => (
              <span key={g.slug} className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Target className="size-3" /> {g.topic} · {g.accuracy}%
              </span>
            ))}
            {codingWeakCompanies.slice(0, 3).map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <Code2 className="size-3" /> {c.name} coding · {c.solveRate}%
              </span>
            ))}
          </div>
        )}
      </BentoCard>

      {/* Interview pointer */}
      <BentoCard title="Interview Skill Gaps" subtitle="Common weaknesses from mock-interview practice.">
        <Link
          href="/tpo/interview-analytics"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#ffc42d] bg-[#fff5ea]/40 p-4 transition-colors hover:bg-[#fff5ea]"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ffd24d] to-[#f5b400] text-[#171717]">
              <MessageSquare className="size-5" />
            </span>
            <span className="text-sm text-slate-600">
              Interview weak areas are analysed in the Interview Analytics module.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-[#f5b400]" />
        </Link>
      </BentoCard>
    </div>
  );
}
