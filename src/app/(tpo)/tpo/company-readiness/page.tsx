'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { getTpoCompanyHeatmap, getTpoCompanyReadinessStudents } from '@/lib/api/tpo';
import { listCompanies } from '@/lib/api/catalog';
import type { TpoCompanyHeatmap, TpoCompanyReadinessReport } from '@/shared';
import { useTpoConsole } from '@/components/tpo/TpoConsole';
import { BentoCard } from '@/components/tpo/ui';
import { CompanyHeatmap } from '@/components/tpo/CompanyHeatmap';
import { ConsoleHero } from '@/components/layout/ConsoleHero';
import { CompanyReadinessTable } from '@/components/tpo/CompanyReadinessTable';

export default function CompanyReadinessPage() {
  const { cohortId, cohorts } = useTpoConsole();
  const [heatmap, setHeatmap] = useState<TpoCompanyHeatmap | null>(null);
  const [companies, setCompanies] = useState<Array<{ slug: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student-level report state (#7).
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<TpoCompanyReadinessReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getTpoCompanyHeatmap(cohortId || undefined)
      .then(setHeatmap)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load company readiness'))
      .finally(() => setLoading(false));
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void listCompanies()
      .then((cs) => setCompanies(cs.map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setReport(null);
      return;
    }
    let alive = true;
    setReportLoading(true);
    getTpoCompanyReadinessStudents(selected, cohortId || undefined)
      .then((r) => alive && setReport(r))
      .catch(() => alive && setReport(null))
      .finally(() => alive && setReportLoading(false));
    return () => {
      alive = false;
    };
  }, [selected, cohortId]);

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

  const companyName = report?.company.name ?? companies.find((c) => c.slug === selected)?.name ?? 'company';

  return (
    <div className="space-y-6">
      <ConsoleHero
        icon={Building2}
        eyebrow="Placement Office"
        title="Company Readiness"
        description="How your students stack up against each recruiter's bar - company by company."
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
        title="Student-level Company Readiness"
        subtitle="Pick a company to see every student's readiness, accuracy and volume on that company's questions and problems - then export."
        source="Company-tagged practice (MCQ) + coding, blended 70/30"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Company</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/30"
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>

        {!selected ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Select a company above to view student-level readiness for your whole batch.
          </p>
        ) : (
          <CompanyReadinessTable
            report={report}
            loading={reportLoading}
            companyName={companyName}
            scopeLabel={cohortLabel}
            emptyHint={`Could not load readiness for ${companyName}. Try again in a moment.`}
          />
        )}
      </BentoCard>
    </div>
  );
}
