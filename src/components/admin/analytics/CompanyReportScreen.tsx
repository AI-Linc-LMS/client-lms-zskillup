'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { describeError } from '@/lib/api/errors';
import {
  CtcCard,
  FunnelTable,
  PeriodBanner,
  RecordedReasonsCard,
  label,
} from '@/components/admin/analytics/rate';
import { getCompanyPlacementReport, type CompanyReportDto } from '@/lib/api/jobs';

/**
 * ONE EMPLOYER, ACROSS EVERY DRIVE THEY HAVE RUN (PRD §14, level 2).
 *
 * The question this answers is not "how did the drive go" — that is the drive level — but
 * "what is this relationship actually worth", which only reads across drives.
 *
 * THE DECLINE REASONS ARE THE POINT. Offers declined, no-shows and candidates who never
 * joined, with the words staff wrote at the time. For an employer relationship that is the
 * most actionable thing on the page: an employer losing people at offer stage has a
 * compensation problem, and one losing them at no-show has a scheduling problem, and the
 * reasons are how you tell which without guessing.
 *
 * THE FUNNEL STARTS AT APPLIED, and the table says so. A student eligible for three of
 * this company's drives is one person, not three, so an eligible-audience total across
 * drives is a figure we cannot honestly produce — better to start lower and be readable.
 */
export function CompanyReportScreen({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCompanyPlacementReport(companyId));
    } catch (e) {
      setError(describeError(e, 'Could not load this company’s report.'));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading the
        report…
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
      >
        {error}
      </p>
    );
  }
  if (!data) return null;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className={label}>Employer report</p>
        <h2 className="mt-1 text-lg font-bold text-navy">
          {data.company.name ?? 'Company'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {data.drives.toLocaleString('en-IN')} drive{data.drives === 1 ? '' : 's'} on record
          {data.timeToFillDays !== null ? ` · median ${data.timeToFillDays} days to fill` : ''}
        </p>
      </div>

      <PeriodBanner period={data.funnel.period} />

      <FunnelTable funnel={data.funnel} topIsApplied={data.funnelTopIsApplied} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CtcCard ctc={data.ctc} />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={label}>Time to fill</p>
          {data.timeToFillDays === null ? (
            <>
              <p className="mt-1 text-sm text-slate-500">No drive has been filled yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Empty because nothing has closed, not because it was instant.
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
                {data.timeToFillDays} days
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Median across this employer&rsquo;s drives
              </p>
            </>
          )}
        </div>
      </div>

      <RecordedReasonsCard
        reasons={data.declineReasons}
        title="Declines, no-shows and non-joiners"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className={label}>Drives</p>
          <p className="mt-0.5 text-base font-bold text-navy">Every drive on record</p>
        </div>
        {data.driveList.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No drives recorded.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.driveList.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/jobs/${d.id}/report`}
                    className="truncate text-sm font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {d.employment_type?.replace(/_/g, ' ').toLowerCase() ?? 'type not set'}
                    {d.published_at
                      ? ` · published ${new Date(d.published_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ' · never published'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {d.status.replace(/_/g, ' ').toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
