'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { getTpoAnalytics, getTpoCompanyHeatmap } from '@/lib/api/tpo';
import type { TpoCompanyHeatmap, TpoDashboard } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { CompanyHeatmap } from '@/components/tpo/CompanyHeatmap';
import { ConsoleHero } from '@/components/layout/ConsoleHero';

export default function CompanyReadinessPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [data, setData] = useState<TpoDashboard | null>(null);
  const [heatmap, setHeatmap] = useState<TpoCompanyHeatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getTpoAnalytics(cohortId || undefined), getTpoCompanyHeatmap(cohortId || undefined)])
      .then(([d, h]) => {
        setData(d);
        setHeatmap(h);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load company readiness'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Building2}
        eyebrow="Placement Office"
        title="Company Readiness"
        description="How your students stack up against each recruiter's bar — company by company."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-inset ring-white/15">
            {cohortLabel}
          </span>
        }
      />

      <BentoCard
        title="Company Readiness Heatmap"
        subtitle="How your students are distributed across readiness bands, per recruiter."
        source="Company-tagged practice accuracy"
      >
        <CompanyHeatmap rows={heatmap?.rows ?? []} />
      </BentoCard>

      <BentoCard
        title="Per-company readiness"
        subtitle="Average accuracy on each company's tagged questions."
        source="Company-tagged practice"
      >
        {(data?.companyReadiness.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No company-tagged practice yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data!.companyReadiness.map((c) => (
              <div key={c.slug} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-navy">{c.name}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-navy">{c.readiness}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffd24d] to-[#f5b400]" style={{ width: `${c.readiness}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{c.attempted} attempts</p>
              </div>
            ))}
          </div>
        )}
      </BentoCard>
    </div>
  );
}
