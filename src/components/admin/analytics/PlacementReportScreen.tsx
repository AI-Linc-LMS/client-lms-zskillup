'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, Loader2, School, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/api/errors';
import {
  CtcCard,
  FunnelTable,
  MilestonesCard,
  PeriodBanner,
  RecordedReasonsCard,
  StageLossesCard,
  label,
  rupees,
} from '@/components/admin/analytics/rate';
import {
  getOverallPlacementReport,
  getStageImprovement,
  type AnalyticsFilterParams,
  type OverallReportDto,
  type StageImprovementDto,
} from '@/lib/api/jobs';

const inputCls =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy focus:border-orange focus-visible:ring-2 focus-visible:ring-orange/30';

/**
 * PLACEMENT, PLATFORM-WIDE (PRD §14, level 5).
 *
 * The drive level shipped first because it sits beside the per-drive pages. This is the
 * one a super-admin and an unscoped admin actually open: everything, at once.
 *
 * THE SCOPING IS THE SERVER'S, NOT THIS SCREEN'S. A scoped admin — a TPO in the three-tier
 * hierarchy — asking for "everything" is answered with their own colleges rather than a
 * 403. The report is still true, just smaller. This client cannot widen that by sending a
 * different filter, which is why the filter set below has no "all colleges" escape hatch.
 *
 * TWO NUMBERS HERE ARE DELIBERATELY NOT THE HEADLINE:
 *
 *   There is no single "placed" figure. §14 insists offer-received, accepted and joined
 *   stay apart, so `MilestonesCard` shows three rates and no total. Anyone wanting one
 *   number has to choose which, and say so.
 *
 *   The funnel's top is every student on the platform, not every applicant. That makes the
 *   first conversion look brutal, and it is the honest denominator: a drive nobody eligible
 *   ever saw is a reach failure, and starting the funnel at "applied" would hide it.
 */
export function PlacementReportScreen() {
  const [filters, setFilters] = useState<AnalyticsFilterParams>({});
  const [applied, setApplied] = useState<AnalyticsFilterParams>({});
  const [data, setData] = useState<OverallReportDto | null>(null);
  const [gaps, setGaps] = useState<StageImprovementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: AnalyticsFilterParams) => {
    setLoading(true);
    setError(null);
    try {
      const [o, g] = await Promise.all([
        getOverallPlacementReport(f),
        getStageImprovement(f).catch(() => null),
      ]);
      setData(o);
      setGaps(g);
    } catch (e) {
      setError(describeError(e, 'Could not load the placement report.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [load, applied]);

  const kpis = useMemo(
    () =>
      data
        ? [
            { k: 'Active drives', v: data.scope.active_drives, icon: Briefcase, hint: 'Published or in progress' },
            { k: 'Employers', v: data.scope.employers, icon: Building2, hint: 'Companies that have run a drive' },
            { k: 'Students', v: data.scope.students, icon: Users, hint: 'The funnel’s denominator' },
            { k: 'Colleges', v: data.scope.colleges, icon: School, hint: 'Real colleges, directory rows excluded' },
          ]
        : [],
    [data],
  );

  return (
    <section className="space-y-5">
      {/* FILTERS. Period only, plus the two drive facets that change what a rate means.
          Deliberately not the full fourteen-field set the API accepts — a filter nobody
          can name the purpose of is a control that produces reports nobody can read. */}
      <form
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(filters);
        }}
      >
        <p className={label}>Narrow the report</p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label htmlFor="pa-from" className="block text-xs font-medium text-slate-600">
              From
            </label>
            <input
              id="pa-from"
              type="date"
              className={inputCls}
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pa-to" className="block text-xs font-medium text-slate-600">
              To
            </label>
            <input
              id="pa-to"
              type="date"
              className={inputCls}
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pa-emp" className="block text-xs font-medium text-slate-600">
              Employment type
            </label>
            <select
              id="pa-emp"
              className={inputCls}
              value={filters.employmentType ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, employmentType: e.target.value || undefined }))
              }
            >
              <option value="">Any</option>
              {['FULL_TIME', 'INTERNSHIP', 'INTERNSHIP_PPO', 'CONTRACT', 'APPRENTICESHIP'].map(
                (t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ').toLowerCase()}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pa-status" className="block text-xs font-medium text-slate-600">
              Drive status
            </label>
            <select
              id="pa-status"
              className={inputCls}
              value={filters.driveStatus ?? ''}
              onChange={(e) =>
                setFilters((f) => ({ ...f, driveStatus: e.target.value || undefined }))
              }
            >
              <option value="">Any</option>
              {['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'CLOSED', 'COMPLETED', 'CANCELLED'].map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Apply
          </Button>
          {Object.values(applied).some(Boolean) ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFilters({});
                setApplied({});
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-slate-300" aria-hidden /> Loading the
          report…
        </p>
      ) : error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
        >
          {error}
        </p>
      ) : !data ? null : (
        <>
          <PeriodBanner period={data.scope.period} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((c) => (
              <div key={c.k} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className={label}>{c.k}</p>
                  <span
                    className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100"
                    aria-hidden
                  >
                    <c.icon className="size-4" />
                  </span>
                </div>
                <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
                  {c.v.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-xs text-slate-500">{c.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MilestonesCard
              milestones={data.placement}
              caption="Measured against every student on the platform, not against applicants — so these are reach figures, not success rates. “Offer → joining” is the one measured against offers."
            />
            <CtcCard ctc={data.ctc} />
          </div>

          <FunnelTable funnel={data.funnel} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className={label}>Time to placement</p>
              {data.timeToPlacementDays === null ? (
                <>
                  <p className="mt-1 text-sm text-slate-500">Nobody has joined yet.</p>
                  <p className="mt-1 text-xs text-slate-400">
                    This is a median of first application to first joining. It stays empty
                    until at least one student has actually started a job — an absence, not a
                    zero.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[26px] font-extrabold leading-none text-navy tabular-nums">
                    {data.timeToPlacementDays} days
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Median, first application to first joining
                  </p>
                </>
              )}
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                A median rather than a mean: one student who applied in first year and joined
                in final year would drag an average past anything typical.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className={label}>Demand by role</p>
                <p className="mt-0.5 text-base font-bold text-navy">What employers are hiring for</p>
              </div>
              {data.roleDemand.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">No drives to count yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.roleDemand.slice(0, 10).map((r) => (
                    <li
                      key={r.role}
                      className="flex items-center justify-between gap-4 px-5 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-slate-700">{r.role}</span>
                      <span className="shrink-0 text-sm font-semibold text-navy tabular-nums">
                        {r.drives}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {gaps ? <StageLossesCard losses={gaps.losses} limit={6} /> : null}
          {gaps ? <RecordedReasonsCard reasons={gaps.recordedReasons} /> : null}

          {/* The other levels are per-id, so they are reached from a list rather than
              from here. Saying where they are beats leaving them URL-only — the last time
              a §14 page had no route in, nobody found it. */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={label}>The other reporting levels</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This is the platform level. A single drive&rsquo;s funnel is on that
              drive&rsquo;s <span className="font-semibold">Report</span> tab; one college or
              cohort is under <Link href="/admin/colleges" className="font-semibold text-navy underline-offset-2 hover:underline">Colleges</Link>;
              one student&rsquo;s history is on their row in{' '}
              <Link href="/admin/students" className="font-semibold text-navy underline-offset-2 hover:underline">Student reports</Link>.
            </p>
            {data.ctc.counted > 0 ? (
              <p className="mt-2 text-xs text-slate-400">
                Highest offer recorded platform-wide: {rupees(data.ctc.highest)}.
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
